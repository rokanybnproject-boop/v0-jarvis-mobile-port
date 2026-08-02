# OpenRouter Integration with Tencent HY3

## Overview
تم إضافة دعم كامل لمنصة OpenRouter بما في ذلك نموذج Tencent HY3 المجاني. يمكنك الآن استخدام 200+ نموذج عبر OpenRouter بجانب المزودين الآخرين.

## Setup Instructions

### 1. Get Your OpenRouter API Key
- Navigate to: https://openrouter.ai/settings/keys
- Create a new API key
- Copy the key (starts with `sk-or-`)

### 2. Add API Key in Settings
1. Open the application settings (top right corner)
2. Navigate to "Vars" section
3. No need to add anything - the app will prompt you for the key

### 3. Select OpenRouter Provider
1. Go to Settings page in the app
2. Select "OpenRouter" from the provider dropdown
3. Paste your API key
4. Click "Save"

### 4. Available Models

#### Free Models
- **tencent/hy3:free** - Tencent HY3 (Free tier, recommended for testing)

#### Popular Models (requires OpenRouter account)
- claude-3.5-sonnet (Anthropic)
- grok-2-1212 (xAI)
- meta-llama/llama-3.1-405b (Meta)
- openai/gpt-4o (OpenAI via OpenRouter)

And 200+ more models available through OpenRouter!

## Error Handling

The system includes comprehensive error handling for OpenRouter issues:

- **Invalid API Key**: Error message will indicate the key is invalid or expired
- **Rate Limiting**: Message shows "rate limit exceeded, please wait"
- **Service Unavailable**: Temporary outages are handled gracefully
- **Model Not Found**: Clear feedback if the model isn't available with your key

## How It Works

1. **Direct API Routing**: All requests go directly to OpenRouter's API (not through Vercel AI Gateway)
2. **Model Discovery**: When you add an API key, the system automatically discovers all available models
3. **Fallback Models**: If discovery fails, a curated list of popular models is shown
4. **OpenAI Compatibility**: Uses OpenAI SDK since OpenRouter is OpenAI-compatible

## Files Modified

- `lib/types.ts` - Added "openrouter" to ProviderId type
- `lib/providers.ts` - Added OpenRouter provider config and fallback models
- `lib/model-factory.ts` - Added OpenRouter model building with error handling
- `app/api/models/validate/route.ts` - Added OpenRouter validation

## Troubleshooting

### "Invalid OpenRouter API key"
- Check the key starts with `sk-or-`
- Verify the key at https://openrouter.ai/settings/keys
- Ensure the key has not expired

### Model not loading
- Try the free Tencent HY3 model first: `tencent/hy3:free`
- Check your OpenRouter account credits
- Verify the model is available in your region

### Rate limiting
- OpenRouter has rate limits based on your plan
- Wait a few moments and retry
- Check your OpenRouter dashboard for current usage

## Notes

- Tencent HY3 free model is ideal for testing and development
- All models support tool calling and vision capabilities (where applicable)
- The system automatically detects OpenRouter API keys by prefix (sk-or-)
