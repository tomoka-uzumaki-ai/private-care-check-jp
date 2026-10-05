"""Offline, tax-included JPY purchase comparison. No product suitability inference."""
import argparse
import json
from pathlib import Path


def yen(value, name):
    if value is None:
        return None
    if type(value) is not int or not 0 <= value <= 10**12:
        raise ValueError(f'{name}: 税込円の0以上の整数、または未確認のnullにしてください')
    return value


def purchase(row):
    if not isinstance(row, dict):
        raise ValueError('購入案はobjectが必要です')
    label = row.get('label')
    if not isinstance(label, str) or not label.strip() or len(label) > 200:
        raise ValueError('labelが必要です（200文字以内）')
    horizon = row.get('horizon')
    if not isinstance(horizon, str) or not horizon.strip():
        raise ValueError('比較する期間horizonを明記してください')
    orders = row.get('orders')
    if not isinstance(orders, list) or not orders or len(orders) > 100:
        raise ValueError('ordersは1〜100件の配列にしてください')
    unknown = []
    subtotal = 0
    for i, order in enumerate(orders):
        if not isinstance(order, dict):
            raise ValueError('orderはobjectが必要です')
        vals = {k: yen(order.get(k), k) for k in
                ('goods_yen', 'shipping_yen', 'payment_fee_yen', 'other_confirmed_yen', 'redeemed_discount_yen')}
        for key, value in vals.items():
            if value is None:
                unknown.append(f'orders[{i}].{key}')
        charges = sum(v for k, v in vals.items() if k != 'redeemed_discount_yen' and v is not None)
        discount = vals['redeemed_discount_yen']
        if discount is not None and discount > charges and all(v is not None for v in vals.values()):
            raise ValueError('確定割引が注文総額を超えています')
        # Partial totals exclude deductions until their full charge basis is known.
        subtotal += charges
        if discount is not None and all(v is not None for v in vals.values()):
            subtotal -= discount
    future = yen(row.get('future_points_face_yen'), 'future_points_face_yen')
    return {
        'label': label, 'horizon': horizon,
        'comparison_key': row.get('comparison_key'),
        'cash_out_yen': subtotal if not unknown else None,
        'known_charges_partial_yen': subtotal,
        'unknown_fields': unknown,
        'future_points_face_yen_not_deducted': future,
        'is_complete': not unknown,
        'basis': row.get('basis', '未確認'),
    }


def compare(data):
    if not isinstance(data, dict) or data.get('currency') != 'JPY_TAX_INCLUDED':
        raise ValueError('税込円JPY_TAX_INCLUDEDのみ対応。通貨換算はしません')
    if data.get('input_kind') not in ('synthetic', 'observed'):
        raise ValueError('input_kindはsyntheticかobservedが必要です')
    options = data.get('options')
    if not isinstance(options, list) or not 1 <= len(options) <= 20:
        raise ValueError('optionsは1〜20案が必要です')
    rows = [purchase(row) for row in options]
    keys = [row['comparison_key'] for row in rows]
    horizons = [row['horizon'] for row in rows]
    same = (all(isinstance(key, str) and key.strip() for key in keys)
            and len(set(keys)) == 1 and len(set(horizons)) == 1)
    complete = all(row['is_complete'] for row in rows)
    can_compare = same and complete and len(rows) > 1
    return {
        'input_kind': data['input_kind'], 'currency': data['currency'],
        'rows': rows, 'cash_comparison_valid': can_compare,
        'lowest_cash_labels': [r['label'] for r in rows if r['cash_out_yen'] == min(x['cash_out_yen'] for x in rows)] if can_compare else [],
        'notice': '支払額の比較です。品質・適合・返品・必要性の順位ではありません。未確認項目を0円にしません。比較キーは入力者の指定で、実商品が同じかは自動検証しません。',
    }


def markdown(result):
    lines = ['# ケア用品の購入費用比較', '', f"入力区分：{result['input_kind']}（syntheticは架空の検査例）", '', result['notice'], '',
             '|案|比較期間|確定支払額・税込円|未確認項目|将来ポイント・未控除|', '|---|---|---:|---|---:|']
    def cell(value):
        return str(value).replace('|', '\\|').replace('\n', ' ').replace('\r', ' ')
    for row in result['rows']:
        cash = '未確定' if row['cash_out_yen'] is None else row['cash_out_yen']
        future = '未確認' if row['future_points_face_yen_not_deducted'] is None else row['future_points_face_yen_not_deducted']
        lines.append('|'+ '|'.join(cell(v) for v in [row['label'], row['horizon'], cash, ', '.join(row['unknown_fields']) or 'なし', future])+'|')
    lines += ['', '同じ比較キー・期間で確定額を比べられる：' + ('はい' if result['cash_comparison_valid'] else 'いいえ'),
              '支払額が最少の案：' + ('、'.join(result['lowest_cash_labels']) or '判定しない'), '',
              '送料のための追加品は、その代金も含めます。再購入回数や寿命は仮定ではなく自分の比較条件を記入します。']
    return '\n'.join(lines) + '\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='ローカルのJSONから購入費用の比較を作ります。入力・出力の送信なし。')
    parser.add_argument('input', type=Path)
    parser.add_argument('--format', choices=['json', 'markdown'], default='markdown')
    args = parser.parse_args()
    try:
        result = compare(json.loads(args.input.read_text(encoding='utf-8')))
        print(json.dumps(result, ensure_ascii=False, indent=2) if args.format == 'json' else markdown(result), end='\n' if args.format == 'json' else '')
    except (ValueError, OSError, TypeError) as error:
        parser.exit(2, str(error) + '\n')
