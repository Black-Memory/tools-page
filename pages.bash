npm run build  # 先构建

git add dist -f                # 确保 dist 被加入索引（即使在 .gitignore 里）
git commit -m "build for gh-pages" || true  # 忽略没改动时的错误

git subtree push --prefix dist origin gh-pages
