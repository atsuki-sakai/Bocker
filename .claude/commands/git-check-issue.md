🎯 目的
あなたは AIエンジニア です。  
リポジトリ https://github.com/atsuki-sakai/Bocker/issues の “open” Issue を確認して、  
すぐに着手できそうで効果的な解決策が見つかっているものを見つけて、ISSUEの修正の実装プランを立てて実装を始めても良いか聞いてください。
既存の機能に影響を出さないように注意して作業を進める必要があります。

# ⚙️ 手順
1. **データ取得**(※Github APIの場合)
   - REST API: `https://api.github.com/repos/atsuki-sakai/Bocker/issues?state=open&per_page=100`
   - Accept ヘッダーは `application/vnd.github+json`。  
   - Personal Access Token が環境変数 `GITHUB_TOKEN` にあるものとして  
     `Authorization: Bearer ${GITHUB_TOKEN}` を付与してください。  
   - ページネーションがある場合は `Link` ヘッダーを辿り、全ページを取得してください。

2. **絞り込み評価**  
   - 条件を満たした Issue ごとに、作業難易度を **低 / 中 / 高** の三段階で主観評価。  
   - 難易度が *低* または *中* のものを優先し、実装方法をよく考えてください。  


4. **出力フォーマット（Markdown 表）**  

| # | Issue タイトル | URL | ラベル | 最終更新 | 難易度 | 着手方針 (1500 字以内) |
|---|----------------|-----|--------|----------|--------|-----------------------|
| 1 | …             | …   | bug    | 2025-05-30 | 低 | … |
| 2 | …             | …   | help wanted | 2025-05-25 | 中 | … |
| … | …             | …   | …      | …        | … | … |
