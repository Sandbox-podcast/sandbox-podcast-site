import argostranslate.package
import os
import minisbd.models


PAIRS = [
    ("fr", "en", "1.9", "français vers anglais"),
    ("en", "es", "1.0", "anglais vers espagnol"),
    ("en", "de", "1.3", "anglais vers allemand"),
]


def main():
    installed = argostranslate.package.get_installed_packages()
    missing = [
        pair
        for pair in PAIRS
        if not any(
            package.from_code == pair[0]
            and package.to_code == pair[1]
            and package.package_version == pair[2]
            for package in installed
        )
    ]
    available = []
    if missing:
        argostranslate.package.update_package_index()
        available = argostranslate.package.get_available_packages()
    for from_code, to_code, package_version, pair_name in missing:
        print(f"Installation du modèle hors ligne {pair_name}…", flush=True)
        matches = [
            package
            for package in available
            if package.from_code == from_code
            and package.to_code == to_code
            and package.package_version == package_version
        ]
        if len(matches) != 1:
            raise RuntimeError(
                f"Le modèle version {package_version} pour {pair_name} n'est pas disponible de façon unique."
            )
        model_path = matches[0].download()
        argostranslate.package.install_from_path(model_path)
    if not missing:
        print("Les trois modèles de traduction sont déjà installés.", flush=True)
    sentence_model_directory = os.environ.get("SANDBOX_NEWS_SBD_DIR")
    if not sentence_model_directory:
        raise RuntimeError("Le dossier local de segmentation des phrases n'est pas défini.")
    minisbd.models.cache_dir = sentence_model_directory
    print("Installation des modèles locaux de segmentation des phrases…", flush=True)
    minisbd.models.download_models(load_only=["fr", "en"])


if __name__ == "__main__":
    main()
