/**
 * Paylaşım metnine göre kısa, empatik Türkçe yanıt (OpenAI veya yedek metin).
 */
async function generateEmpathyReply(content) {
  const text = String(content || '').trim().slice(0, 2000);
  const fallback =
    'Buradasın ve duyguların geçerli. Kendine nazik ol; küçük adımlar da önemlidir.';

  if (!text) return fallback;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return fallback;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'Sen güvenli bir dertleşme alanındasın. Türkçe yanıt ver. En fazla 3 kısa cümle: empatik, destekleyici, yargılamayan. Tavsiye dayatma; duyguyu onayla. Markdown veya liste kullanma.',
          },
          {
            role: 'user',
            content: `Birinin paylaştığı metin:\n\n${text}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.65,
      }),
    });

    const data = await response.json();
    const out = data?.choices?.[0]?.message?.content?.trim();
    if (response.ok && out) return out.slice(0, 600);
    console.error('Empati AI hata:', data?.error || data);
  } catch (e) {
    console.error('Empati AI istisna:', e.message);
  }
  return fallback;
}

/**
 * Anonim paylaşım sonrası kullanıcıya gidecek özel DM metni (daha uzun, yargılamayan).
 */
async function generateAnonymousDmMessage(content, empathyLine) {
  const snippet = String(content || '').trim().slice(0, 800);
  const line = String(empathyLine || '').trim().slice(0, 400);
  const fallback = [
    'Merhaba,',
    '',
    line ? `Paylaşımını okuduk: ${line}` : 'Anonim paylaşımını aldık.',
    '',
    'Burada yargılanmıyorsun; duygularının geçerli olduğunu bil. İstersen mesajlar üzerinden devam edebilir veya sadece yazmış olmanın rahatlığını yaşayabilirsin.',
    '',
    '— BiriVar',
  ].join('\n');

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY || !snippet) return fallback;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'BiriVar dertleşme platformunun destek asistanısın. Kullanıcı az önce ANONİM paylaşım yaptı. Ona özel bir DM yazıyorsun. Türkçe, 4–7 cümle. Empatik, destekleyici, asla yargılama. İsim kullanma. Paylaşım metnini kelimesi kelimesine alıntılama; genel ve güvenli bir dil kullan. Tıbbi veya kesin tanı verme. İmza: son satırda "— BiriVar".',
          },
          {
            role: 'user',
            content: `Kısa empati özeti (akışta gösterilen): ${line || '(yok)'}\n\nPaylaşımın duygusal özeti (içerik detayını DM\'de tekrarlama):\n${snippet}`,
          },
        ],
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const out = data?.choices?.[0]?.message?.content?.trim();
    if (response.ok && out) return out.slice(0, 2000);
  } catch (e) {
    console.error('Anonim DM AI:', e.message);
  }
  return fallback;
}

module.exports = { generateEmpathyReply, generateAnonymousDmMessage };
