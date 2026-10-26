const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const JsonRepository = require('../src/repositories/json.repository');

describe('JsonRepository Unit Tests', () => {
  const tempDir = path.resolve(__dirname, `.tmp-repo-test-${Date.now()}`);

  before(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('Corrupted/malformed JSON in data file throws DATA_STORE_PARSE_ERROR and NEVER resets or erases file', () => {
    const corruptedFileName = 'corrupted.json';
    const filePath = path.join(tempDir, corruptedFileName);
    const corruptedContent = '{ "broken": json without closing brackets...';

    fs.writeFileSync(filePath, corruptedContent, 'utf8');

    const repo = new JsonRepository(corruptedFileName, tempDir);

    assert.throws(
      () => {
        repo.readAll();
      },
      (err) => {
        return err.code === 'DATA_STORE_PARSE_ERROR';
      }
    );

    // Verify file content was NOT overwritten with empty array
    const remainingContent = fs.readFileSync(filePath, 'utf8');
    assert.equal(remainingContent, corruptedContent);
  });

  it('Missing data store file throws DATA_STORE_MISSING', () => {
    const repo = new JsonRepository('non_existent.json', tempDir);
    assert.throws(
      () => {
        repo.readAll();
      },
      (err) => {
        return err.code === 'DATA_STORE_MISSING';
      }
    );
  });

  it('Atomic writes successfully persist and preserve records', async () => {
    const fileName = 'test-records.json';
    const repo = new JsonRepository(fileName, tempDir);

    // Initialize with empty array
    await repo.writeAll([]);

    // Create 3 items
    await repo.create({ id: 'REC-1', name: 'Item 1' });
    await repo.create({ id: 'REC-2', name: 'Item 2' });
    await repo.create({ id: 'REC-3', name: 'Item 3' });

    const all = repo.findAll();
    assert.equal(all.length, 3);

    // Update item 2
    await repo.update('REC-2', { name: 'Item 2 Updated' });
    const item2 = repo.findById('REC-2');
    assert.equal(item2.name, 'Item 2 Updated');

    // Soft delete item 1
    await repo.softDelete('REC-1');
    const item1 = repo.findById('REC-1');
    assert.equal(item1.isDeleted, true);
    assert.ok(item1.deletedAt);
  });
});
