export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada en Vercel' });

  try {
    const { weekStr } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: 'Eres analista senior de SEO, IA y ecommerce latinoamericano. Buscas noticias reales de la semana y las clasificas segun su valor para emprendedores y duenos de tiendas online en LATAM. Respondes UNICAMENTE con JSON valido. Sin texto antes ni despues. Sin backticks. Sin comillas dobles dentro de los valores string. Maximo 150 caracteres por campo de texto.',
        messages: [{
          role: 'user',
          content: 'Busca entre 12 y 15 noticias reales y relevantes de la ' + weekStr + ' sobre: SEO tecnico y algoritmos Google, IA aplicada a marketing y SEO, ecommerce latinoamericano, herramientas nuevas de SEO e IA, casos de estudio con resultados reales.\n\nClasifica cada noticia en una de estas 3 categorias segun el valor que aporta a emprendedores y duenos de tiendas online LATAM:\n- PRO: informacion estrategica profunda, muy accionable, ventaja competitiva real, datos exclusivos o analisis tecnico avanzado.\n- GRATIS: informacion util y relevante pero mas general, buenas practicas, tendencias.\n- LINKEDIN: novedades llamativas, datos curiosos, temas de debate que generan conversacion.\n\nResponde SOLO con este JSON sin texto adicional:\n{"pro":[{"titulo":"string","fuente":"string","resumen":"string","por_que_pro":"string"}],"gratis":[{"titulo":"string","fuente":"string","resumen":"string","por_que_gratis":"string"}],"linkedin":[{"titulo":"string","fuente":"string","resumen":"string","angulo":"string"}]}'
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'No se encontro JSON en la respuesta' });

    let raw = match[0].replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/,\s*([}\]])/g, '$1');

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch(e) {
      const cut = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
      try { parsed = JSON.parse(raw.slice(0, cut + 1)); }
      catch(e2) { return res.status(500).json({ error: 'JSON invalido: ' + e.message }); }
    }

    return res.status(200).json(parsed);

  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
