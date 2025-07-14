import os
from mistralai import Mistral
from typing import List, Dict
from dotenv import load_dotenv

dir = os.path.dirname(os.path.abspath(__file__))
env_file = os.path.join(dir, "../database/data.env")
load_dotenv(env_file)

async def call_mistral_api(prompt: str, max_tokens: int, model: str = "open-mistral-7b") -> str:
    try:
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            raise ValueError("MISTRAL_API_KEY environment variable not set")

        client = Mistral(api_key=api_key)
        messages = [
            {"role": "user", "content": prompt}
        ]

        response = client.chat.complete(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3,
        )
        if response.choices and response.choices[0].message.content:
            return response.choices[0].message.content
    except Exception as e:
        raise f"Error calling Mistral API: {str(e)}"