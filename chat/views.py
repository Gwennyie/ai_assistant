import json
import time
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST
from google import genai
from google.genai import types

SYSTEM_PROMPT = (
    "You are a friendly lesson helper for students. Explain things simply, "
    "use short numbered points and everyday analogies, and keep answers concise. "
    "Stay school-safe."
)


def index(request):
    return render(request, 'chat/index.html')


def offline(request):
    return render(request, 'chat/offline.html')


@require_POST
def ask(request):
    """Backend proxy: the API key never reaches the browser."""
    try:
        prompt = json.loads(request.body).get('prompt', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid request.'}, status=400)

    if not prompt:
        return JsonResponse({'error': 'Please type a question.'}, status=400)
    if not settings.GEMINI_API_KEY:
        return JsonResponse({'error': 'Server API key is not configured.'}, status=500)

    models = [settings.GEMINI_MODEL, settings.GEMINI_FALLBACK_MODEL]
    last_error = None

    for model in models:
        if not model:
            continue
        for attempt in range(3):
            try:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
                )
                return JsonResponse({'reply': response.text or 'No response generated.'})
            except Exception as exc:
                last_error = exc
                if '503' in str(exc) or '429' in str(exc):
                    time.sleep(2 ** attempt)  # wait 1s, 2s, 4s, then retry
                    continue
                break  # other errors (bad key, 404): don't retry this model

    print('Gemini error:', last_error)
    return JsonResponse(
        {'error': 'The AI service is busy right now. Please try again in a moment.'},
        status=502,
    )


def manifest(request):
    data = (Path(settings.BASE_DIR) / 'chat/static/chat/manifest.json').read_text()
    return HttpResponse(data, content_type='application/manifest+json')


def service_worker(request):
    data = (Path(settings.BASE_DIR) / 'chat/static/chat/sw.js').read_text()
    resp = HttpResponse(data, content_type='application/javascript')
    resp['Service-Worker-Allowed'] = '/'
    resp['Cache-Control'] = 'no-cache'
    return resp