require("dotenv").config();
const express = require("express");
const { initFirebase } = require("./firebase");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Initialize Firestore once, when the server starts.
const db = initFirebase();

app.get("/", (req, res) => {
  res.send("TrustTracer server is alive");
});

async function analyzeReview(reviewText) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a fake-review detector. Analyze this review for authenticity signals
(generic language, no specific details, excessive superlatives, urgency phrasing).

Review: "${reviewText}"

Respond with ONLY valid JSON in this exact shape, nothing else, no markdown, no code fences:
{
  "title": "a short 3-5 word label summarizing what product/topic this review is about",
  "fakeScore": a number from 0 to 100,
  "reasoning": "a short explanation"
}`;

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]) {
      let replyText = data.candidates[0].content.parts[0].text;

      replyText = replyText.trim();
      if (replyText.startsWith("```")) {
        replyText = replyText.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      try {
        const parsed = JSON.parse(replyText);

        // Decide the verdict ourselves from the score, so the label and
        // number always agree — instead of trusting Gemini's own wording.
        let verdict;
        if (parsed.fakeScore >= 66) {
          verdict = "Fake";
        } else if (parsed.fakeScore >= 33) {
          verdict = "Suspicious";
        } else {
          verdict = "Genuine";
        }

        return { ...parsed, verdict };
      } catch (parseErr) {
        console.log(`Attempt ${attempt}: could not parse Gemini's reply:`, replyText);
        if (attempt === maxAttempts) {
          throw new Error("Gemini's reply could not be parsed as JSON after retries.");
        }
        continue;
      }
    }

    console.log(`Attempt ${attempt} failed:`, JSON.stringify(data, null, 2));

    const isRetryable = data.error && data.error.code === 503;

    if (!isRetryable || attempt === maxAttempts) {
      throw new Error("Gemini did not return a valid response after retries.");
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
  }
}

app.post("/api/analyze", async (req, res) => {
  const { reviewText, productName, rating, reviewerName } = req.body;

  if (!reviewText) {
    return res.status(400).json({ error: "reviewText is required" });
  }

  try {
    const analysis = await analyzeReview(reviewText);

    const docRef = await db.collection("reviews").add({
      reviewText: reviewText,
      title: analysis.title,
      productName: productName || null,
      rating: rating || null,
      reviewerName: reviewerName || null,
      verdict: analysis.verdict,
      fakeScore: analysis.fakeScore,
      reasoning: analysis.reasoning,
      createdAt: new Date().toISOString(),
    });

    res.json({
      id: docRef.id,
      reviewText,
      productName,
      rating,
      reviewerName,
      ...analysis,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Request failed:", err);
    res.status(500).json({ error: "Something went wrong analyzing the review." });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const snapshot = await db.collection("reviews").orderBy("createdAt", "desc").limit(15).get();
    const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ reviews });
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const snapshot = await db.collection("reviews").get();
    const stats = { total: 0, Genuine: 0, Suspicious: 0, Fake: 0 };

    snapshot.forEach((doc) => {
      const data = doc.data();
      stats.total += 1;
      if (stats[data.verdict] !== undefined) {
        stats[data.verdict] += 1;
      }
    });

    res.json(stats);
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});