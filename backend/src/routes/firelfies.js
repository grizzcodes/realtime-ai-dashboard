const express = require('express');
const FirefliesService = require('../../services/firefliesService');
const router = express.Router();

const fireflies = new FirefliesService();

router.get('/transcripts', async (req, res) => {
  const { success, transcripts, error } = await fireflies.getRecentTranscripts(10);

  if (!success) {
    return res.status(500).json({ success: false, error });
  }

  return res.json({ success: true, transcripts });
});

module.exports = router;
