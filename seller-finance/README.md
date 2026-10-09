# 売場の報告額・実入金・未回収を、通貨別に整理する

デジタル商品や紹介収入の数字を、同じ対象期間で確認する無料ツールです。手数料を二度引かず、不明をゼロに置き換えず、JPYとUSDを分けて結果と残る確認を持ち帰れます。

**まずは[1期間の準備済みCSVを無料で集計する](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/csv-trial/ja.html)。** [English trial](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/csv-trial/)もあります。少数の入力や、たまの1ファイルなら、無料版や自分の表計算で作業を完了できます。

## 無料で試す手順

1. [列の対応を整理する](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/column-map/)か、[架空の入出力例](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/english/)を読む。
2. UTF-8・1期間・指定13列のCSVを用意する。無料集計は1ファイル、最大1MB・5000データ行・収入経路100件。
3. 結果を確認し、通貨別の集計CSV・結果TXT・残る確認の別ファイルを保存する。

列名と順番は次のとおりです。各売場やASPの元CSVを、そのまま自動で変換・取り込む形式ではありません。

```csv
row,period,name,type,currency,basis,amount,refunds,platformFees,received,payoutFees,costPaid,costComplete
```

金額はJPYの整数、USDの小数2桁まで。空欄は不明、`0`は確認できたゼロです。控除前・控除後を選び、控除後の金額から返金・販売手数料をもう一度引かないようにします。経路名は仮名にし、顧客情報・口座番号・認証情報を入れないでください。

ブラウザーとJavaScriptがあれば無料版を使えます。Pythonや口座接続は不要です。入力は端末内で処理し、外部送信・永続保存しません。必要なファイルは自分で保存してください。[手入力の無料収支ノート](https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/)も利用できます。

## 複数CSVの処理を繰り返す場合だけ

[CSV収支照合キット — itch.io、最低US$3](https://tiny-deduction-lab.itch.io/csv-income-reconciliation-kit)

同じ13列へ整えた複数CSVをまとめて処理し、不正な行・期間の混在・重複を確認するPythonキットです。ZIPでコード・入力例・手順を受け取り、通貨別の集計CSV、確認票HTML、整理した入力JSON、計算結果JSONを作れます。無料の1ファイル集計だけで済む場合は購入不要です。

**購入前に、Python 3.9以上が動くパソコンと、指定形式の準備済みUTF-8 CSVが必要です。** ターミナルでコードを実行します。税・通貨換算等を含む最終支払額は購入画面で確認してください。

キットのコード・例・手順は、同梱の許諾通知を残す条件で利用・改変・再配布・商用利用できます。自分の入力データの権利は別途確認してください。AIを用いて制作した素材の独占的著作権は保証しません。

## 数字の意味を確認する

計算値は、銀行への着金証明・会計認証・税務上の利益認定ではありません。回収済み差額は、この対象の実入金から支払済み費用を引いたものです。未払費用・自分の労働時間・税は含みません。実入金は入金手数料控除後の額を使い、その手数料を再控除しません。

通貨の換算・合算、金融口座への接続、支払い、税務申告、実際の入金や入力値の真正性の確認は行いません。原資料との照合と、保存ファイルの管理は利用者が行ってください。
