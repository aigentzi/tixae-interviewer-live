function generateAudioMp3Url(input: {
  provider: string;
  voiceId: string;
  sampleText: string;
}) {
  return `https://na-api.v2v.live/api/eu/workspace/${process.env.TIXAE_WORKSPACE_ID}/tts/${
    input.provider
  }/generate-sample/${input.voiceId}?sample_text=${
    input.sampleText || `Hi, how are you today?`
  }`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") || "elevenlabs";
  const voiceId = searchParams.get("voiceId");
  const sampleText = searchParams.get("sampleText") || "Hi, how are you today?";

  if (!voiceId) {
    return new Response("Voice ID is required", { status: 400 });
  }

  const audioMp3Url = generateAudioMp3Url({ provider, voiceId, sampleText });

  try {
    const response = await fetch(audioMp3Url);

    if (!response.ok) {
      return new Response(`External API error: ${response.statusText}`, {
        status: response.status,
      });
    }

    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    console.error("Voice preview API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
