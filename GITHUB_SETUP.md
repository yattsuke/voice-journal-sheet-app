# GitHub Setup

This project is ready to publish as its own repository from this folder:

`G:\マイドライブ\お仕事(g)\ai\codes\voice-journal-sheet-app`

## Recommended Files To Commit

- `app/`
- `lib/`
- `scripts/`
- `package.json`
- `tsconfig.json`
- `next-env.d.ts`
- `next.config.ts`
- `.eslintrc.json`
- `.gitignore`
- `.env.example`
- `README.md`

## Do Not Commit

- `.env.local`
- `.data/`
- `.next/`
- `node_modules/`
- `.vercel/`

## Option 1: GitHub Desktop

1. Install GitHub Desktop.
2. Choose `File -> Add local repository`.
3. Select:

```text
G:\マイドライブ\お仕事(g)\ai\codes\voice-journal-sheet-app
```

4. If prompted, create a repository in this folder.
5. Review the changed files.
6. Commit with a message like:

```text
Initial commit for voice journal app
```

7. Publish repository to GitHub.

Repository name suggestion:

```text
voice-journal-sheet-app
```

## Option 2: Git CLI

Use these commands after Git is installed and available in PATH.

```bash
cd G:\マイドライブ\お仕事(g)\ai\codes\voice-journal-sheet-app
git init
git add .
git commit -m "Initial commit for voice journal app"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/voice-journal-sheet-app.git
git push -u origin main
```

## After Pushing

1. Import the repository into Vercel.
2. Add environment variables in Vercel.
3. Deploy and use the issued `https://...vercel.app` URL from Android Chrome.
