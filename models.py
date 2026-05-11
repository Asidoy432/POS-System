from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name     = db.Column(db.String(100), nullable=False)
    role          = db.Column(db.String(10), nullable=False, default='staff')
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    last_login    = db.Column(db.DateTime, nullable=True)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)


class Category(db.Model):
    __tablename__ = 'categories'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), unique=True, nullable=False)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    products   = db.relationship('Product', backref='category', lazy=True)


class Product(db.Model):
    __tablename__ = 'products'
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(200), nullable=False)
    description   = db.Column(db.Text, nullable=True)
    price         = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    quantity      = db.Column(db.Integer, nullable=False, default=0)
    category_id   = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    image_data    = db.Column(db.Text, nullable=True)
    total_sold    = db.Column(db.Integer, default=0)
    total_revenue = db.Column(db.Numeric(12, 2), default=0)
    expiry_date   = db.Column(db.Date, nullable=True)
    barcode       = db.Column(db.String(100), unique=True, nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'name':        self.name,
            'description': self.description,
            'price':       float(self.price),
            'quantity':    self.quantity,
            'category_id': self.category_id,
            'category':    self.category.name if self.category else None,
            'image_data':  self.image_data,
            'total_sold':  self.total_sold,
            'total_revenue': float(self.total_revenue),
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'barcode':     self.barcode,
        }


class Warehouse(db.Model):
    __tablename__ = 'warehouse'
    id         = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    qty_in     = db.Column(db.Integer, default=0)
    qty_out    = db.Column(db.Integer, default=0)
    note       = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    product    = db.relationship('Product', backref='warehouse_logs')
    user       = db.relationship('User')

    def to_dict(self):
        return {
            'id':           self.id,
            'product_id':   self.product_id,
            'product_name': self.product.name if self.product else '',
            'qty_in':       self.qty_in,
            'qty_out':      self.qty_out,
            'note':         self.note,
            'created_by':   self.user.full_name if self.user else 'System',
            'created_at':   self.created_at.isoformat(),
        }


class Transaction(db.Model):
    __tablename__ = 'transactions'
    id        = db.Column(db.Integer, primary_key=True)
    order_ref = db.Column(db.String(20), unique=True, nullable=False)
    total     = db.Column(db.Numeric(10, 2), nullable=False)
    cash      = db.Column(db.Numeric(10, 2), nullable=False)
    change    = db.Column(db.Numeric(10, 2), nullable=False)
    user_id   = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at= db.Column(db.DateTime, default=datetime.utcnow)
    items     = db.relationship('TransactionItem', backref='transaction', lazy=True, cascade='all, delete-orphan')
    user      = db.relationship('User')

    def to_dict(self):
        return {
            'id':         self.id,
            'order_ref':  self.order_ref,
            'total':      float(self.total),
            'cash':       float(self.cash),
            'change':     float(self.change),
            'cashier':    self.user.full_name if self.user else 'Unknown',
            'created_at': self.created_at.isoformat(),
            'items':      [i.to_dict() for i in self.items],
        }


class TransactionItem(db.Model):
    __tablename__ = 'transaction_items'
    id              = db.Column(db.Integer, primary_key=True)
    transaction_id  = db.Column(db.Integer, db.ForeignKey('transactions.id', ondelete='CASCADE'), nullable=False)
    product_id      = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='SET NULL'), nullable=True)
    product_name    = db.Column(db.String(200), nullable=False)
    category_name   = db.Column(db.String(100), nullable=True)
    price           = db.Column(db.Numeric(10, 2), nullable=False)
    quantity        = db.Column(db.Integer, nullable=False)
    subtotal        = db.Column(db.Numeric(10, 2), nullable=False)
    hour_of_day     = db.Column(db.SmallInteger, nullable=True)
    day_of_week     = db.Column(db.SmallInteger, nullable=True)

    def to_dict(self):
        return {
            'product_name':  self.product_name,
            'category_name': self.category_name,
            'price':         float(self.price),
            'quantity':      self.quantity,
            'subtotal':      float(self.subtotal),
        }


class Setting(db.Model):
    __tablename__ = 'settings'
    key   = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text, nullable=False)
