
import openpyxl, sys, io

USD_TO_IQD = 1560

wb = openpyxl.load_workbook(r'c:\Users\jaafa\Desktop\upload\FishWebClean\Yee_Products_2026_UPDATED.xlsx', data_only=True)
ws = wb['Sheet1']
rows = list(ws.iter_rows(values_only=True))

total_buy_usd = 0
total_cost_landed_iqd = 0
total_revenue_iqd = 0
total_qty = 0
categories = {'S': {'qty':0,'cost':0,'rev':0,'profit':0}, 'M': {'qty':0,'cost':0,'rev':0,'profit':0}, 'L': {'qty':0,'cost':0,'rev':0,'profit':0}}
products_detail = []

for row in rows[1:]:
    if not row[0] or str(row[0]).strip() == '':
        continue
    try:
        qty = float(str(row[3]).replace(',','')) if row[3] else 0
        buy_usd = float(str(row[4]).replace(',','')) if row[4] else 0
        box_size = str(row[5]) if row[5] else 'S'
        total_cost_unit = float(str(row[7]).replace(',','')) if row[7] else 0
        new_price = float(str(row[9]).replace(',','')) if row[9] else 0
        profit_unit = new_price - total_cost_unit

        total_qty += qty
        total_buy_usd += buy_usd * qty
        total_cost_landed_iqd += total_cost_unit * qty
        total_revenue_iqd += new_price * qty

        if box_size in categories:
            categories[box_size]['qty'] += qty
            categories[box_size]['cost'] += total_cost_unit * qty
            categories[box_size]['rev'] += new_price * qty
            categories[box_size]['profit'] += profit_unit * qty

        margin = (profit_unit / new_price * 100) if new_price > 0 else 0
        products_detail.append({
            'num': row[0],
            'name': str(row[2])[:40] if row[2] else '',
            'qty': qty,
            'buy_usd': buy_usd,
            'cost_unit': total_cost_unit,
            'price': new_price,
            'profit': profit_unit,
            'margin': margin,
            'box': box_size
        })
    except Exception as e:
        pass

out = io.StringIO()
out.write('=== INVESTMENT SUMMARY ===\n')
out.write(f'Total Items: {int(total_qty)} pieces\n')
out.write(f'Total Purchase Cost: ${total_buy_usd:.2f} USD = {total_buy_usd * USD_TO_IQD:,.0f} IQD\n')

ship1 = 600 * USD_TO_IQD
ship2 = 500 * USD_TO_IQD
total_ship = ship1 + ship2

out.write(f'Total Landed Cost (incl. packaging per-unit): {total_cost_landed_iqd:,.0f} IQD\n')
out.write(f'\nShipping:\n')
out.write(f'  Order 1 Regular goods 600$: {ship1:,.0f} IQD\n')
out.write(f'  Order 2 Medical goods 500$: {ship2:,.0f} IQD\n')
out.write(f'  Total Shipping: {total_ship:,.0f} IQD\n')

# Check if shipping is already in the per-unit cost
# Pack cost: S=1185, M=1435, L=1635 which INCLUDES carton + shipping allocation
# Carton: S=500, M=800, L=1000
# So shipping per unit: S=685, M=635, L=635
ship_s = categories['S']['qty'] * 685
ship_m = categories['M']['qty'] * 635
ship_l = categories['L']['qty'] * 635
implied_ship = ship_s + ship_m + ship_l

out.write(f'\nShipping already allocated in Excel per-unit: {implied_ship:,.0f} IQD\n')
out.write(f'Actual Shipping Declared: {total_ship:,.0f} IQD\n')
diff = implied_ship - total_ship
if diff >= 0:
    out.write(f'BUFFER: Excel overestimates by {diff:,.0f} IQD (GOOD - safety margin)\n')
else:
    out.write(f'RISK: Excel underestimates by {abs(diff):,.0f} IQD\n')

out.write('\n=== FULL REVENUE PROJECTION ===\n')
total_profit = total_revenue_iqd - total_cost_landed_iqd
out.write(f'Total Revenue if all sold: {total_revenue_iqd:,.0f} IQD\n')
out.write(f'Total Cost (landed+pack): {total_cost_landed_iqd:,.0f} IQD\n')
out.write(f'Gross Profit: {total_profit:,.0f} IQD\n')
gm = total_profit/total_revenue_iqd*100
out.write(f'Gross Margin: {gm:.1f}%\n')

total_revenue_usd = total_revenue_iqd / USD_TO_IQD
out.write(f'Revenue in USD: ${total_revenue_usd:,.0f}\n')

out.write('\n=== DISCOUNT IMPACT ANALYSIS ===\n')
for disc in [5, 10, 15, 20]:
    rev_after = total_revenue_iqd * (1 - disc/100)
    profit_after = rev_after - total_cost_landed_iqd
    margin_after = profit_after/rev_after*100
    out.write(f'  {disc}% discount: Rev={rev_after:,.0f} | Profit={profit_after:,.0f} | Margin={margin_after:.1f}%\n')

out.write('\n=== COUPON CODE SCENARIO (10% avg discount) ===\n')
coupon_disc = 0.10
rev_coupon = total_revenue_iqd * (1-coupon_disc)
profit_coupon = rev_coupon - total_cost_landed_iqd
out.write(f'Revenue after 10% coupons: {rev_coupon:,.0f} IQD\n')
out.write(f'Profit after 10% coupons: {profit_coupon:,.0f} IQD\n')
out.write(f'Margin after 10% coupons: {profit_coupon/rev_coupon*100:.1f}%\n')

out.write('\n=== MARKETING COSTS ===\n')
out.write('Brochures @ 400 IQD/pc:\n')
for qty2 in [100, 200, 500, 1000]:
    out.write(f'  {qty2} pcs: {qty2*400:,} IQD\n')
out.write('UGC Cards @ 260 IQD/pc:\n')
for qty2 in [100, 200, 500, 1000]:
    out.write(f'  {qty2} pcs: {qty2*260:,} IQD\n')

out.write('\n=== CATEGORY BREAKDOWN ===\n')
for cat in ['S','M','L']:
    data = categories[cat]
    if data['qty'] > 0:
        m = data['profit']/data['rev']*100 if data['rev'] > 0 else 0
        out.write(f'  Box {cat}: {int(data["qty"])} pcs | Revenue={data["rev"]:,.0f} | Margin={m:.1f}%\n')

out.write('\n=== TOP 10 MOST PROFITABLE (total profit) ===\n')
products_detail.sort(key=lambda x: x['profit']*x['qty'], reverse=True)
for p in products_detail[:10]:
    out.write(f'  #{p["num"]} {p["name"][:35]:<35} | Qty:{int(p["qty"])} | Price:{p["price"]:,} | Margin:{p["margin"]:.0f}%\n')

out.write('\n=== LOW MARGIN PRODUCTS (< 30%) ===\n')
low_margin = [p for p in products_detail if p['margin'] < 30 and p['price'] > 0]
for p in sorted(low_margin, key=lambda x: x['margin']):
    out.write(f'  #{p["num"]} {p["name"][:35]:<35} | Price:{p["price"]:,} | Margin:{p["margin"]:.0f}%\n')

out.write('\n=== BREAK-EVEN ANALYSIS ===\n')
# Total investment = cost + shipping + any other fixed
total_invest = total_cost_landed_iqd
out.write(f'Total Investment: {total_invest:,.0f} IQD\n')
be_pct = total_invest / total_revenue_iqd * 100
out.write(f'Need to sell {be_pct:.1f}% of inventory to break even\n')
out.write(f'Break-even quantity at avg price: need to cover {total_invest:,.0f} IQD\n')

sys.stdout.buffer.write(out.getvalue().encode('utf-8', errors='replace'))
