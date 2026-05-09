import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_SMALL_FAST_MODEL, ANTHROPIC_BASE_URL } from './config.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: ANTHROPIC_BASE_URL,
});

export const TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web for current information, news, prices, weather, and real-time data. ALWAYS use this for any question about current events, prices, or live data.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query - be specific and include key terms' },
        maxResults: { type: 'number', description: 'Maximum number of results', default: 5 }
      },
      required: ['query']
    }
  },
  {
    name: 'get_crypto_price',
    description: 'Get real-time cryptocurrency prices in USD. Use this for ANY question about Bitcoin, Ethereum, or any other cryptocurrency prices.',
    input_schema: {
      type: 'object',
      properties: {
        coin: { type: 'string', description: 'Coin name or symbol like bitcoin, ethereum, BTC, ETH, solana, DOGE' }
      },
      required: ['coin']
    }
  },
  {
    name: 'calculate',
    description: 'Evaluate a mathematical expression safely',
    input_schema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Mathematical expression to evaluate' }
      },
      required: ['expression']
    }
  },
  {
    name: 'get_current_datetime',
    description: 'Get the current date and time in a specific timezone',
    input_schema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'IANA timezone (e.g. America/New_York, UTC, Asia/Karachi)', default: 'UTC' }
      }
    }
  },
  {
    name: 'generate_image_prompt',
    description: 'Generate a detailed image generation prompt from a simple description',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Simple description of the desired image' },
        style: { type: 'string', description: 'Art style: realistic, anime, oil-painting, pixel-art', default: 'realistic' }
      },
      required: ['description']
    }
  },
  {
    name: 'summarize_url',
    description: 'Fetch and summarize the content of a URL',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch and summarize' }
      },
      required: ['url']
    }
  }
];

async function executeWebSearch(query, maxResults = 5) {
  const startTime = Date.now();
  try {
    // Try DuckDuckGo Instant Answer API first
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();

    // Build formatted results string
    let resultsText = '';

    // If there's an abstract/answer, use it
    if (data.AbstractText) {
      resultsText += `Answer: ${data.AbstractText}\n`;
      if (data.AbstractURL) resultsText += `Source: ${data.AbstractURL}\n`;
      resultsText += '\n';
    }

    // If there are related topics, add them
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      resultsText += 'Related Information:\n';
      for (const topic of data.RelatedTopics.slice(0, maxResults)) {
        if (topic.Text) {
          const title = topic.Text.split(' - ')[0] || 'Result';
          resultsText += `• ${topic.Text}\n`;
        }
      }
    }

    if (!resultsText.trim()) {
      resultsText = 'No results found for: ' + query;
    }

    return {
      results: resultsText,
      query,
      durationMs: Date.now() - startTime
    };
  } catch (err) {
    return { results: `Search error: ${err.message}`, query, error: err.message, durationMs: Date.now() - startTime };
  }
}

async function executeGetCryptoPrice(coin) {
  const startTime = Date.now();
  try {
    const coinMap = {
      'bitcoin': 'bitcoin', 'btc': 'bitcoin', 'xbt': 'bitcoin',
      'ethereum': 'ethereum', 'eth': 'ethereum',
      'solana': 'solana', 'sol': 'solana',
      'bnb': 'binancecoin', 'binance': 'binancecoin',
      'xrp': 'ripple', 'ripple': 'ripple',
      'cardano': 'cardano', 'ada': 'cardano',
      'dogecoin': 'dogecoin', 'doge': 'dogecoin',
      'polkadot': 'polkadot', 'dot': 'polkadot',
      'avalanche': 'avalanche-2', 'avax': 'avalanche-2',
      'chainlink': 'chainlink', 'link': 'chainlink',
      'polygon': 'matic-network', 'matic': 'matic-network',
      'tether': 'tether', 'usdt': 'tether',
      'usdc': 'usd-coin', 'usd-coin': 'usd-coin'
    };
    const coinId = coinMap[coin.toLowerCase()] || coin.toLowerCase();
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,pkr&include_24hr_change=true&include_last_updated=true`;
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();
    const price = data[coinId];
    if (!price) {
      return { error: `Coin not found: ${coin}. Try a different name like 'bitcoin', 'ethereum', 'solana'`, durationMs: Date.now() - startTime };
    }
    const change = price.usd_24h_change ? price.usd_24h_change.toFixed(2) : 'N/A';
    const changeEmoji = price.usd_24h_change >= 0 ? '▲' : '▼';
    return {
      coin: coinId,
      prices: `💰 ${coinId.toUpperCase()} Price:\n   USD: $${price.usd?.toLocaleString()}\n   PKR: ₨${price.pkr?.toLocaleString()}\n   24h Change: ${changeEmoji} ${change}%`,
      durationMs: Date.now() - startTime
    };
  } catch (err) {
    return { error: `Crypto price lookup failed: ${err.message}`, durationMs: Date.now() - startTime };
  }
}

function executeCalculate(expression) {
  const startTime = Date.now();
  try {
    const sanitized = expression.replace(/[^0-9+\-*/().% ]/gi, '');
    const allowedChars = /^[0-9+\-*/().%\s]+$/;
    if (!allowedChars.test(sanitized)) {
      throw new Error('Invalid characters in expression');
    }
    const result = new Function(`return (${sanitized})`)();
    return { result: typeof result === 'number' ? (Number.isFinite(result) ? result : 'undefined') : 'undefined', expression, durationMs: Date.now() - startTime };
  } catch (err) {
    return { result: null, expression, error: err.message, durationMs: Date.now() - startTime };
  }
}

function executeGetCurrentDatetime(timezone = 'UTC') {
  const startTime = Date.now();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const parts = formatter.formatToParts(new Date());
    const getPart = (type) => parts.find(p => p.type === type)?.value || '';
    return {
      date: `${getPart('month')} ${getPart('day')}, ${getPart('year')}`,
      time: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
      timezone,
      dayOfWeek: new Date().toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long' }),
      durationMs: Date.now() - startTime
    };
  } catch (err) {
    return { error: `Invalid timezone: ${timezone}`, durationMs: Date.now() - startTime };
  }
}

async function executeGenerateImagePrompt(description, style = 'realistic') {
  const startTime = Date.now();
  try {
    const metaPrompt = `Given this image description: "${description}"
Generate a detailed Stable Diffusion-style prompt for a ${style} image.
Return ONLY a JSON object with this format: {"prompt": "...", "negativePrompt": "..."}
Do not include any other text.`;

    const response = await client.messages.create({
      model: ANTHROPIC_SMALL_FAST_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: metaPrompt }]
    });

    const text = response.content[0].text.trim();
    let parsed = { prompt: description, negativePrompt: 'blurry, low quality' };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const obj = JSON.parse(jsonMatch[0]);
        parsed = { prompt: obj.prompt || description, negativePrompt: obj.negativePrompt || 'blurry, low quality' };
      }
    } catch { /* use defaults */ }

    return { ...parsed, style, description, durationMs: Date.now() - startTime };
  } catch (err) {
    return { prompt: description, negativePrompt: 'blurry, low quality', style, error: err.message, durationMs: Date.now() - startTime };
  }
}

async function executeSummarizeUrl(url) {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChatAI/1.0)' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, header, footer, aside, [role="navigation"], [role="banner"]').remove();

    let textContent = '';
    $('p, h1, h2, h3, h4, h5, h6, li').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 20) textContent += t + '\n';
    });

    textContent = textContent.slice(0, 8000);

    const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || url;

    if (!textContent.trim()) {
      return { summary: 'Could not extract content from this page.', title: pageTitle, url, durationMs: Date.now() - startTime };
    }

    const summaryPrompt = `Summarize the following content in 3-5 bullet points. Focus on the most important information.\n\nContent:\n${textContent.slice(0, 4000)}`;

    const aiResponse = await client.messages.create({
      model: ANTHROPIC_SMALL_FAST_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: summaryPrompt }]
    });

    return {
      summary: aiResponse.content[0].text.trim(),
      title: pageTitle,
      url,
      durationMs: Date.now() - startTime
    };
  } catch (err) {
    return { summary: '', title: url, url, error: err.message, durationMs: Date.now() - startTime };
  }
}

export async function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'web_search':
      return await executeWebSearch(toolInput.query, toolInput.maxResults);
    case 'get_crypto_price':
      return await executeGetCryptoPrice(toolInput.coin);
    case 'calculate':
      return executeCalculate(toolInput.expression);
    case 'get_current_datetime':
      return executeGetCurrentDatetime(toolInput.timezone);
    case 'generate_image_prompt':
      return await executeGenerateImagePrompt(toolInput.description, toolInput.style);
    case 'summarize_url':
      return await executeSummarizeUrl(toolInput.url);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}