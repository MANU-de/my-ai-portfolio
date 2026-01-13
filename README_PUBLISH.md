How to publish this project to GitHub (sanitized)

1) Create a GitHub repository under your account `MANU-de`, e.g. `my-ai-portfolio`.

2) Extract the prepared tarball or use the `publish` folder created by the script.

To create the sanitized copy and tarball locally run:

```bash
# from project root
scripts/prepare_publish.sh
```

This creates `publish/` and `my-ai-portfolio-publish.tar.gz`.

3) Push to GitHub (example using SSH)

```bash
# from project root
# extract if using tarball
tar -xzf my-ai-portfolio-publish.tar.gz
cd publish
# set remote (replace repo name if different)
git remote add origin git@github.com:MANU-de/my-ai-portfolio.git
git branch -M main
git push -u origin main
```

Or using HTTPS:

```bash
git remote add origin https://github.com/MANU-de/my-ai-portfolio.git
git push -u origin main
```

Notes:
- The script excludes `.env`, `.env.*`, `.next`, `node_modules`, `.git`, and common key files. Review `scripts/prepare_publish.sh` excludes and adjust if you need to omit additional files.
- You must authenticate with GitHub to push (SSH key or a Personal Access Token for HTTPS).
- Do NOT commit or push any sensitive credentials (API keys, private keys, or `.env` files). Keep them local or use GitHub Secrets for deployments.
