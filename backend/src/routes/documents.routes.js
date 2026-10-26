const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');

router.get('/', documentController.getDocuments);
router.get('/:id/preview', documentController.previewDocument);
router.get('/:id/file', documentController.previewDocument);
router.get('/:id', documentController.getDocumentById);
router.patch('/:id', documentController.updateDocument);

module.exports = router;
