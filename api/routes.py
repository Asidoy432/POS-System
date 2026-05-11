from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from models import db, Product, Category, Transaction, TransactionItem, Warehouse, Setting, User
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_
import random, string

api = Blueprint('api', __name__, url_prefix='/api')

def ok(data=None):
    return jsonify({'success': True, 'data': data})

def err(msg, code=400):
    return jsonify({'success': False, 'error': msg}), code


# ── PRODUCTS ──────────────────────────────────────
@api.get('/products')
@login_required
def get_products():
    cat = request.args.get('category')
    q   = request.args.get('q', '').strip()
    query = Product.query
    if cat and cat != 'all':
        query = query.filter_by(category_id=cat)
    if q:
        query = query.filter(Product.name.ilike(f'%{q}%'))
    return ok([p.to_dict() for p in query.order_by(Product.name).all()])


@api.get('/products/<int:pid>')
@login_required
def get_product(pid):
    p = Product.query.get_or_404(pid)
    return ok(p.to_dict())


@api.get('/products/barcode/<bc>')
@login_required
def get_by_barcode(bc):
    p = Product.query.filter_by(barcode=bc).first()
    if not p:
        return err('Product not found', 404)
    return ok(p.to_dict())


@api.post('/products')
@login_required
def save_product():
    d = request.json or {}
    pid = d.get('id')
    if pid:
        p = Product.query.get_or_404(pid)
    else:
        p = Product()
        db.session.add(p)

    p.name        = d.get('name', p.name if pid else '')
    p.description = d.get('description', '')
    p.price       = float(d.get('price', 0))
    p.quantity    = int(d.get('quantity', 0))
    p.category_id = d.get('category_id') or None
    p.image_data  = d.get('image_data', p.image_data if pid else None)
    p.barcode     = d.get('barcode') or None

    raw_exp = d.get('expiry_date', '')
    p.expiry_date = datetime.strptime(raw_exp, '%Y-%m-%d').date() if raw_exp else None

    db.session.commit()
    return ok(p.to_dict())


@api.delete('/products/<int:pid>')
@login_required
def delete_product(pid):
    p = Product.query.get_or_404(pid)
    db.session.delete(p)
    db.session.commit()
    return ok()


# ── CATEGORIES ────────────────────────────────────
@api.get('/categories')
@login_required
def get_categories():
    cats = Category.query.order_by(Category.sort_order, Category.name).all()
    return ok([{'id': c.id, 'name': c.name} for c in cats])


@api.post('/categories')
@login_required
def save_category():
    d = request.json or {}
    name = d.get('name', '').strip()
    if not name:
        return err('Name required')
    cat = Category.query.filter_by(name=name).first()
    if not cat:
        cat = Category(name=name)
        db.session.add(cat)
        db.session.commit()
    return ok({'id': cat.id, 'name': cat.name})


@api.delete('/categories/<int:cid>')
@login_required
def delete_category(cid):
    cat = Category.query.get_or_404(cid)
    db.session.delete(cat)
    db.session.commit()
    return ok()


# ── CHECKOUT ──────────────────────────────────────
@api.post('/checkout')
@login_required
def checkout():
    d = request.json or {}
    items = d.get('items', [])
    cash  = float(d.get('cash', 0))
    if not items:
        return err('Cart is empty')

    total = sum(float(i['price']) * int(i['qty']) for i in items)
    if cash < total:
        return err('Insufficient cash')

    ref = 'ORD-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    now = datetime.utcnow()

    tx = Transaction(
        order_ref=ref, total=total, cash=cash,
        change=cash - total, user_id=current_user.id
    )
    db.session.add(tx)
    db.session.flush()

    for i in items:
        p = Product.query.get(i['product_id'])
        qty = int(i['qty'])
        sub = float(i['price']) * qty
        ti  = TransactionItem(
            transaction_id=tx.id,
            product_id=i['product_id'],
            product_name=i['name'],
            category_name=i.get('category'),
            price=float(i['price']),
            quantity=qty,
            subtotal=sub,
            hour_of_day=now.hour,
            day_of_week=now.weekday(),
        )
        db.session.add(ti)
        if p:
            p.quantity    = max(0, p.quantity - qty)
            p.total_sold  = (p.total_sold or 0) + qty
            p.total_revenue = float(p.total_revenue or 0) + sub

    db.session.commit()
    return ok({'order_ref': ref, 'total': total, 'change': cash - total})


# ── TRANSACTIONS / SALES HISTORY ──────────────────
@api.get('/transactions')
@login_required
def get_transactions():
    date_str = request.args.get('date', '')
    limit    = int(request.args.get('limit', 50))
    query    = Transaction.query
    if date_str:
        try:
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(
                and_(Transaction.created_at >= datetime.combine(d, datetime.min.time()),
                     Transaction.created_at <  datetime.combine(d + timedelta(days=1), datetime.min.time()))
            )
        except ValueError:
            pass
    txs = query.order_by(Transaction.created_at.desc()).limit(limit).all()
    return ok([t.to_dict() for t in txs])


# ── ANALYTICS ─────────────────────────────────────
@api.get('/analytics')
@login_required
def get_analytics():
    today     = date.today()
    week_ago  = today - timedelta(days=6)
    month_ago = today - timedelta(days=29)

    def day_totals(since):
        rows = db.session.query(
            func.date(Transaction.created_at).label('d'),
            func.sum(Transaction.total).label('total'),
            func.count(Transaction.id).label('orders')
        ).filter(Transaction.created_at >= since).group_by('d').order_by('d').all()
        return [{'date': str(r.d), 'total': float(r.total), 'orders': r.orders} for r in rows]

    top = db.session.query(
        TransactionItem.product_name,
        func.sum(TransactionItem.quantity).label('qty'),
        func.sum(TransactionItem.subtotal).label('rev')
    ).group_by(TransactionItem.product_name).order_by(func.sum(TransactionItem.subtotal).desc()).limit(5).all()

    today_total = db.session.query(func.sum(Transaction.total)).filter(
        func.date(Transaction.created_at) == today
    ).scalar() or 0

    return ok({
        'today_sales':  float(today_total),
        'week_chart':   day_totals(week_ago),
        'month_chart':  day_totals(month_ago),
        'top_products': [{'name': r.product_name, 'qty': int(r.qty), 'rev': float(r.rev)} for r in top],
    })


# ── WAREHOUSE ─────────────────────────────────────
@api.get('/warehouse')
@login_required
def get_warehouse():
    prods = Product.query.order_by(Product.name).all()
    result = []
    for p in prods:
        total_in  = db.session.query(func.sum(Warehouse.qty_in)).filter_by(product_id=p.id).scalar() or 0
        total_out = db.session.query(func.sum(Warehouse.qty_out)).filter_by(product_id=p.id).scalar() or 0
        result.append({**p.to_dict(), 'wh_in': int(total_in), 'wh_out': int(total_out)})
    return ok(result)


@api.post('/warehouse/move')
@login_required
def warehouse_move():
    d          = request.json or {}
    product_id = d.get('product_id')
    move_type  = d.get('type')   # 'in' or 'out'
    qty        = int(d.get('qty', 0))
    note       = d.get('note', '')

    if not product_id or move_type not in ('in', 'out') or qty <= 0:
        return err('Invalid data')

    p = Product.query.get_or_404(product_id)
    log = Warehouse(
        product_id=product_id,
        qty_in=qty  if move_type == 'in'  else 0,
        qty_out=qty if move_type == 'out' else 0,
        note=note,
        created_by=current_user.id
    )
    db.session.add(log)
    if move_type == 'in':
        p.quantity += qty
    else:
        p.quantity = max(0, p.quantity - qty)
    db.session.commit()
    return ok(p.to_dict())


@api.get('/warehouse/logs')
@login_required
def warehouse_logs():
    logs = Warehouse.query.order_by(Warehouse.created_at.desc()).limit(100).all()
    return ok([l.to_dict() for l in logs])


# ── SETTINGS ──────────────────────────────────────
@api.get('/settings')
@login_required
def get_settings():
    rows = Setting.query.all()
    return ok({r.key: r.value for r in rows})


@api.post('/settings')
@login_required
def save_settings():
    if current_user.role != 'owner':
        return err('Owner only', 403)
    d = request.json or {}
    for key in ('shop_name', 'currency', 'tax_rate'):
        if key in d:
            s = Setting.query.get(key)
            if s:
                s.value = str(d[key])
            else:
                db.session.add(Setting(key=key, value=str(d[key])))
    db.session.commit()
    return ok()


# ── USER MANAGEMENT ───────────────────────────────
@api.get('/users')
@login_required
def get_users():
    if current_user.role != 'owner':
        return err('Owner only', 403)
    users = User.query.order_by(User.full_name).all()
    return ok([{
        'id': u.id, 'username': u.username,
        'full_name': u.full_name, 'role': u.role,
        'last_login': u.last_login.isoformat() if u.last_login else None
    } for u in users])


@api.post('/users')
@login_required
def save_user():
    if current_user.role != 'owner':
        return err('Owner only', 403)
    d  = request.json or {}
    uid = d.get('id')
    if uid:
        u = User.query.get_or_404(uid)
    else:
        u = User()
        db.session.add(u)
    u.username  = d.get('username', u.username if uid else '')
    u.full_name = d.get('full_name', u.full_name if uid else '')
    u.role      = d.get('role', 'staff')
    if d.get('password'):
        u.set_password(d['password'])
    db.session.commit()
    return ok({'id': u.id})


@api.delete('/users/<int:uid>')
@login_required
def delete_user(uid):
    if current_user.role != 'owner':
        return err('Owner only', 403)
    if uid == current_user.id:
        return err('Cannot delete yourself')
    u = User.query.get_or_404(uid)
    db.session.delete(u)
    db.session.commit()
    return ok()


@api.post('/change_password')
@login_required
def change_password():
    d = request.json or {}
    if not current_user.check_password(d.get('current', '')):
        return err('Current password incorrect')
    new_pw = d.get('new', '')
    if len(new_pw) < 6:
        return err('Password must be at least 6 characters')
    current_user.set_password(new_pw)
    db.session.commit()
    return ok()


# ── DELETE TRANSACTION ─────────────────────────────
@api.delete('/transactions/<int:tid>')
@login_required
def delete_transaction(tid):
    if current_user.role != 'owner':
        return err('Owner only', 403)
    tx = Transaction.query.get_or_404(tid)
    db.session.delete(tx)
    db.session.commit()
    return ok()


@api.delete('/transactions')
@login_required
def delete_all_transactions():
    if current_user.role != 'owner':
        return err('Owner only', 403)
    TransactionItem.query.delete()
    Transaction.query.delete()
    db.session.commit()
    return ok()


# ════════════════════════════════════════════════
# CSV EXPORTS
# ════════════════════════════════════════════════
import csv, io
from flask import Response

def make_csv(filename, headers, rows):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    w.writerows(rows)
    buf.seek(0)
    return Response(
        buf.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )


@api.get('/export/sales')
@login_required
def export_sales():
    date_str = request.args.get('date', '')
    query = Transaction.query
    if date_str:
        try:
            from datetime import timedelta
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(
                Transaction.created_at >= datetime.combine(d, datetime.min.time()),
                Transaction.created_at <  datetime.combine(d + timedelta(days=1), datetime.min.time())
            )
        except ValueError:
            pass

    txs = query.order_by(Transaction.created_at.desc()).all()
    headers = ['Order Ref', 'Date', 'Time', 'Total', 'Cash', 'Change', 'Cashier', 'Items']
    rows = []
    for tx in txs:
        item_summary = '; '.join(
            f"{i.product_name} x{i.quantity}" for i in tx.items
        )
        rows.append([
            tx.order_ref,
            tx.created_at.strftime('%Y-%m-%d'),
            tx.created_at.strftime('%H:%M:%S'),
            f'{tx.total:.2f}',
            f'{tx.cash:.2f}',
            f'{tx.change:.2f}',
            tx.user.full_name if tx.user else 'Unknown',
            item_summary,
        ])
    fname = f"sales_{date_str or 'all'}.csv"
    return make_csv(fname, headers, rows)


@api.get('/export/sales_items')
@login_required
def export_sales_items():
    """Detailed line-item export — one row per product per transaction."""
    date_str = request.args.get('date', '')
    query = TransactionItem.query.join(Transaction)
    if date_str:
        try:
            from datetime import timedelta
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            query = query.filter(
                Transaction.created_at >= datetime.combine(d, datetime.min.time()),
                Transaction.created_at <  datetime.combine(d + timedelta(days=1), datetime.min.time())
            )
        except ValueError:
            pass

    items = query.order_by(Transaction.created_at.desc()).all()
    headers = ['Order Ref', 'Date', 'Time', 'Product', 'Category', 'Price', 'Qty', 'Subtotal', 'Cashier']
    rows = []
    for i in items:
        tx = i.transaction
        rows.append([
            tx.order_ref,
            tx.created_at.strftime('%Y-%m-%d'),
            tx.created_at.strftime('%H:%M:%S'),
            i.product_name,
            i.category_name or '',
            f'{i.price:.2f}',
            i.quantity,
            f'{i.subtotal:.2f}',
            tx.user.full_name if tx.user else 'Unknown',
        ])
    fname = f"sales_items_{date_str or 'all'}.csv"
    return make_csv(fname, headers, rows)


@api.get('/export/products')
@login_required
def export_products():
    products = Product.query.order_by(Product.name).all()
    headers = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Barcode',
               'Total Sold', 'Total Revenue', 'Expiry Date']
    rows = []
    for p in products:
        rows.append([
            p.id, p.name,
            p.category.name if p.category else '',
            f'{p.price:.2f}',
            p.quantity,
            p.barcode or '',
            p.total_sold or 0,
            f'{float(p.total_revenue or 0):.2f}',
            p.expiry_date.isoformat() if p.expiry_date else '',
        ])
    return make_csv('products.csv', headers, rows)


@api.get('/export/inventory')
@login_required
def export_inventory():
    """Stock levels with warehouse in/out totals."""
    from sqlalchemy import func
    products = Product.query.order_by(Product.name).all()
    headers = ['Product', 'Category', 'Barcode', 'Current Stock',
               'Total Restocked', 'Total Removed', 'Price', 'Stock Value', 'Expiry']
    rows = []
    for p in products:
        wh_in  = db.session.query(func.sum(Warehouse.qty_in)).filter_by(product_id=p.id).scalar() or 0
        wh_out = db.session.query(func.sum(Warehouse.qty_out)).filter_by(product_id=p.id).scalar() or 0
        rows.append([
            p.name,
            p.category.name if p.category else '',
            p.barcode or '',
            p.quantity,
            int(wh_in),
            int(wh_out),
            f'{p.price:.2f}',
            f'{p.quantity * float(p.price):.2f}',
            p.expiry_date.isoformat() if p.expiry_date else '',
        ])
    return make_csv('inventory.csv', headers, rows)


@api.get('/export/warehouse_log')
@login_required
def export_warehouse_log():
    logs = Warehouse.query.order_by(Warehouse.created_at.desc()).all()
    headers = ['Date', 'Time', 'Product', 'Type', 'Qty In', 'Qty Out', 'Note', 'By']
    rows = []
    for l in logs:
        move_type = 'Restock' if l.qty_in > 0 else 'Removal'
        rows.append([
            l.created_at.strftime('%Y-%m-%d'),
            l.created_at.strftime('%H:%M:%S'),
            l.product.name if l.product else '',
            move_type,
            l.qty_in,
            l.qty_out,
            l.note or '',
            l.user.full_name if l.user else 'System',
        ])
    return make_csv('warehouse_log.csv', headers, rows)
