# 受取条件と販売収支、必要な確認から始める

このリポジトリには、ケア用品を買う方の受取条件ガイドと、デジタル商品・紹介収入を整理する販売者向けツールがあります。目的に合う入口を選んでください。どちらも無料で利用できます。

## ケア用品の外装・書類・受取方法を確かめたい方

[受取条件ノートを開く](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/)

外装、決済明細、納品書、別送の請求書、受取方法を分けて確認します。[店ごとの書類](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/compare.html)、[贈る前の確認](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/gift.html)、[保証の確認](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/warranty.html)も選べます。購入条件を日英で整理するなら、[条件票を作る](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/merchant-sheet/)ことができます。

確認ガイドの利用に商品購入は不要です。特定の配送や秘匿性を保証するものではありません。実際に注文する場合は、対象商品の現在の条件を各店の公式案内・購入画面で確認してください。

## 売場の報告額と実入金を整理したい販売者

[日本語で1期間のCSVを無料集計](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/csv-trial/ja.html) · [Try one prepared CSV in English](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/csv-trial/)

デジタル商品や紹介収入の、報告額・実入金・計算上の未回収を通貨別に整理します。まず架空の入力例で試し、集計CSV・結果TXT・残る確認を保存できます。自分のCSVを使う場合は、先に[日本語の列対応](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/column-map/)／[English column mapping](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/column-map/en.html)で必要な13列へ整えます。元の売場CSVをそのまま自動変換するツールではありません。

無料集計はUTF-8・1期間・1ファイル、最大1MB・5000データ行・収入経路100件。JPYとUSDは別集計です。空欄は未確認、`0`は確認済みのゼロとして扱います。顧客情報・口座番号・認証情報を入れず、収入経路には仮名を使ってください。入力はブラウザー内で処理し、外部送信・永続保存しません。必要な結果は自分で保存します。

### 同じ処理を複数CSVで繰り返す場合だけ

[CSV収支照合キットのGumroad版](https://jikkenlog.gumroad.com/l/csv-income-reconciliation-kit) · [同じキットのitch.io版](https://tiny-deduction-lab.itch.io/csv-income-reconciliation-kit)

日英のPythonコード・入力例・手順をZIPで受け取る同じキットです。指定13列に整えた複数CSVから、通貨別の集計CSV・確認票HTML・入力と計算結果のJSONを作ります。Python 3.9以上を実行できるパソコンと、準備済みUTF-8 CSVが必要です。どちらか一方の売場を選べば十分です。現在の価格、税・通貨換算等を含む最終額と利用条件は購入前に確認してください。

Gumroadを検討している方は、[日本語の無料試用](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/csv-trial/ja.html?from=gumroad)／[English free trial](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/csv-trial/?from=gumroad)から、列対応や集計を試した後も同じ売場へ戻れます。

たまの1ファイルなら無料版や表計算で完了でき、有料版は不要です。着金証明・会計認証・税務申告、口座接続、通貨換算、売場からの自動取得は行いません。ケア用品の購入条件確認とは別の作業です。[詳しい入力条件・出力・利用条件](seller-finance/README.md)も確認できます。
