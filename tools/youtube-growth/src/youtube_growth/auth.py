from __future__ import annotations

import argparse
import json
from pathlib import Path


SCOPES = [
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.upload",
]


def authorize(client_secrets: Path, token_path: Path) -> None:
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError as error:
        raise RuntimeError("Installez requirements.txt avant de lancer l'autorisation OAuth.") from error

    flow = InstalledAppFlow.from_client_secrets_file(str(client_secrets), SCOPES)
    credentials = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(credentials.to_json(), encoding="utf-8")
    token_path.chmod(0o600)
    print(f"Jeton écrit dans {token_path}. Ne l'ajoutez jamais à Git.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Autoriser SANDBOX à utiliser l'API YouTube.")
    parser.add_argument("client_secrets", type=Path, help="JSON OAuth Desktop téléchargé depuis Google Cloud")
    parser.add_argument("--token", type=Path, default=Path(".youtube-token.json"))
    args = parser.parse_args()
    authorize(args.client_secrets, args.token)


if __name__ == "__main__":
    main()
