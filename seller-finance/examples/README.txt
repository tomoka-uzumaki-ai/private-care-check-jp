# CSV収支照合キット・架空の入力と出力見本

全部架空の数字です。実績・利益の証明ではありません。
review.htmlをブラウザーで開き、summary.csvと照合してください。JPYとUSDは合算していません。

入力: income.csv / costs.csv
出力: review.html / summary.csv / inputs-clean.json / calculation.json

入力JSONは無料版 https://tomoka-uzumaki-ai.github.io/private-care-check-jp/seller-finance/ の「入力JSONを読み込む」で試せます。
このZIPにPythonの実行コードは含まれません。出力例を確認するための見本です。
複数CSV処理のコード・日本語の手順は https://tiny-deduction-lab.itch.io/csv-income-reconciliation-kit にあります。Python3.9以上が動くPCが必要、最低US$3。各ASPのCSV自動変換ではありません。

期待結果: JPY確定収入10200/実入金7000/未回収3000/支払済み費用2000/回収差額5000。USD確定25.50/実入金20.50/未回収5.00/費用5.50/回収差額15.00。

見本の入力・出力・手順の利用・改変・再配布・商用利用を当方の権利の範囲で許可します。独占権は保証しません。AIを用いて制作。税務申告・口座連携・支払いは行いません。
