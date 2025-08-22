export async function GET() {
  try {
    // In a real app, fetch from help center service
    const faqs = [
      { id: 'u1', question: 'How do I reset my password?', answer: 'Go to Settings → Security → Reset Password.' },
      { id: 'u2', question: 'How can I report a bug?', answer: 'Use Help & Support → Contact form with details.' },
      { id: 'u3', question: 'How to change weight units?', answer: 'Settings → Weight Units, choose KG or LBS.' },
    ];
    return Response.json(faqs);
  } catch (e) {
    return new Response('Failed to load FAQs', { status: 500 });
  }
}




