export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').toLowerCase();
    if (!q) return Response.json([]);
    // Naive in-memory search; replace with help center search API
    const corpus = [
      { id: 'u1', question: 'How do I reset my password?', answer: 'Go to Settings → Security → Reset Password.' },
      { id: 'u2', question: 'How can I report a bug?', answer: 'Use Help & Support → Contact form with details.' },
      { id: 'u3', question: 'How to change weight units?', answer: 'Settings → Weight Units, choose KG or LBS.' },
      { id: 'u4', question: 'How do I edit my profile?', answer: 'Go to Profile → Edit.' },
    ];
    const results = corpus.filter(item => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q));
    return Response.json(results);
  } catch (e) {
    return new Response('Search failed', { status: 500 });
  }
}




