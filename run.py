"""Run the local app without exposing keys in HTML, shell history or process args."""
import argparse
import getpass
import os
import uvicorn

if __name__ == '__main__':
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--ai', action='store_true', help='Enter a Groq API key locally (hidden input)')
    args = parser.parse_args()
    if args.ai:
        if not os.environ.get('GROQ_MODEL'):
            os.environ['GROQ_MODEL'] = 'openai/gpt-oss-20b'
        if not os.environ.get('GROQ_API_KEY'):
            os.environ['GROQ_API_KEY'] = getpass.getpass('Groq API key (hidden input): ').strip()
        if not os.environ['GROQ_API_KEY'] or not os.environ['GROQ_MODEL']:
            parser.error('A non-empty model ID and API key are required for AI mode')
    uvicorn.run('backend.app:app', host='127.0.0.1', port=8000, access_log=False, proxy_headers=False)
