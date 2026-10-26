const fs = require('fs');
const path = require('path');
const HttpError = require('../utils/http-error');

/**
 * Async queue for serializing file writes per file path
 * Ensures that concurrent writes within a single Node.js process do not race.
 */
class FileWriteQueue {
  constructor() {
    this.queues = new Map();
  }

  enqueue(filePath, task) {
    const previousPromise = this.queues.get(filePath) || Promise.resolve();
    const nextPromise = previousPromise
      .then(() => task())
      .catch((err) => {
        // Re-throw so the caller receives the error, but don't break subsequent queue tasks
        throw err;
      })
      .finally(() => {
        if (this.queues.get(filePath) === nextPromise) {
          this.queues.delete(filePath);
        }
      });

    this.queues.set(filePath, nextPromise);
    return nextPromise;
  }
}

const writeQueue = new FileWriteQueue();

/**
 * Reusable JSON Repository for local file-based storage.
 * Designed for single-process prototype/hackathon environments.
 */
class JsonRepository {
  /**
   * @param {string} fileName - Name of the file, e.g. 'claims.json'
   * @param {string} [customDataDir] - Optional custom data directory for testing
   */
  constructor(fileName, customDataDir = null) {
    this.fileName = fileName;
    this.dataDir = customDataDir || process.env.DATA_DIR || path.join(__dirname, '../data');
    this.filePath = path.resolve(this.dataDir, this.fileName);
  }

  /**
   * Ensure target directory exists
   */
  _ensureDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Read raw data from JSON file.
   * Throws explicit HttpError/Error on malformed JSON; NEVER resets corrupted files.
   * @returns {Array<object>} Array of records
   */
  readAll() {
    if (!fs.existsSync(this.filePath)) {
      throw HttpError.internal(
        `Data store file not found: ${this.fileName}`,
        'DATA_STORE_MISSING',
        { filePath: this.filePath }
      );
    }

    const content = fs.readFileSync(this.filePath, 'utf8').trim();
    if (!content) {
      return [];
    }

    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error(`Data store root is not an array in ${this.fileName}`);
      }
      return parsed;
    } catch (err) {
      throw HttpError.internal(
        `Failed to parse data store file: ${this.fileName}. Corrupted JSON format.`,
        'DATA_STORE_PARSE_ERROR',
        { originalError: err.message, filePath: this.filePath }
      );
    }
  }

  /**
   * Safely write array of records to file using temp file + atomic rename,
   * serialized via async writeQueue.
   * @param {Array<object>} records
   * @returns {Promise<void>}
   */
  async writeAll(records) {
    if (!Array.isArray(records)) {
      throw HttpError.badRequest('Repository writeAll expects an array of records');
    }

    this._ensureDirectory();

    return writeQueue.enqueue(this.filePath, async () => {
      const serialized = JSON.stringify(records, null, 2);
      const tempPath = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;

      try {
        await fs.promises.writeFile(tempPath, serialized, 'utf8');
        await fs.promises.rename(tempPath, this.filePath);
      } catch (err) {
        // Clean up temp file if rename failed
        if (fs.existsSync(tempPath)) {
          try {
            await fs.promises.unlink(tempPath);
          } catch (_) {}
        }
        throw HttpError.internal(`Failed to atomically save file ${this.fileName}`, 'FILE_WRITE_ERROR', {
          originalError: err.message
        });
      }
    });
  }

  /**
   * List all records with optional filter predicate
   * @param {Function} [predicate]
   * @returns {Array<object>}
   */
  findAll(predicate = null) {
    const records = this.readAll();
    if (typeof predicate === 'function') {
      return records.filter(predicate);
    }
    return records;
  }

  /**
   * Find a record by ID or throw 404
   * @param {string} id
   * @param {string} [idField='id']
   * @returns {object|null}
   */
  findById(id, idField = 'id') {
    if (!id) return null;
    const records = this.readAll();
    return records.find((item) => String(item[idField]) === String(id)) || null;
  }

  /**
   * Create a new record and persist
   * @param {object} newRecord
   * @returns {Promise<object>}
   */
  async create(newRecord) {
    if (!newRecord || typeof newRecord !== 'object') {
      throw HttpError.badRequest('Record must be a valid object');
    }

    const records = this.readAll();
    records.push(newRecord);
    await this.writeAll(records);
    return newRecord;
  }

  /**
   * Update a record by ID
   * @param {string} id
   * @param {object} updates
   * @param {string} [idField='id']
   * @returns {Promise<object>}
   */
  async update(id, updates, idField = 'id') {
    if (!id) {
      throw HttpError.badRequest('ID is required for update');
    }

    const records = this.readAll();
    const index = records.findIndex((item) => String(item[idField]) === String(id));
    if (index === -1) {
      throw HttpError.notFound(`Record with ID '${id}' not found in ${this.fileName}`);
    }

    const updated = {
      ...records[index],
      ...updates,
      [idField]: records[index][idField], // preserve primary ID
      updatedAt: updates.updatedAt || new Date().toISOString()
    };

    records[index] = updated;
    await this.writeAll(records);
    return updated;
  }

  /**
   * Soft-delete a record by setting isDeleted = true and isDeletedAt
   * @param {string} id
   * @param {string} [idField='id']
   * @returns {Promise<object>}
   */
  async softDelete(id, idField = 'id') {
    return this.update(id, {
      isDeleted: true,
      deletedAt: new Date().toISOString()
    }, idField);
  }

  /**
   * Hard-delete a record (only used when explicitly permitted or in test cleanup)
   * @param {string} id
   * @param {string} [idField='id']
   * @returns {Promise<object>}
   */
  async hardDelete(id, idField = 'id') {
    const records = this.readAll();
    const index = records.findIndex((item) => String(item[idField]) === String(id));
    if (index === -1) {
      throw HttpError.notFound(`Record with ID '${id}' not found in ${this.fileName}`);
    }

    const [removed] = records.splice(index, 1);
    await this.writeAll(records);
    return removed;
  }
}

module.exports = JsonRepository;
