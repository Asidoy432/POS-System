import os
from flask import Flask, render_template, redirect, url_for, request, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from dotenv import load_dotenv
from models import db, User, Category, Setting
from api.routes import api
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# ── CONFIG ──────────────────────────────────────────────────────────
app.config['SECRET_KEY']            = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///pos.db')
# Vercel/Supabase uses postgres:// but SQLAlchemy needs postgresql://
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 280,
}

# ── EXTENSIONS ──────────────────────────────────────────────────────
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

app.register_blueprint(api)

@login_manager.user_loader
def load_user(uid):
    return User.query.get(int(uid))


# ── DB INIT ─────────────────────────────────────────────────────────
def init_db():
    db.create_all()
    # Default settings
    defaults = [('shop_name', 'POS System'), ('currency', '₱'), ('tax_rate', '0')]
    for key, val in defaults:
        if not Setting.query.get(key):
            db.session.add(Setting(key=key, value=val))
    # Default categories
    for i, name in enumerate(['Food', 'Drinks', 'Snacks', 'Desserts', 'Others']):
        if not Category.query.filter_by(name=name).first():
            db.session.add(Category(name=name, sort_order=i))
    # Default admin
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', full_name='Admin', role='owner')
        admin.set_password('admin123')
        db.session.add(admin)
    db.session.commit()


with app.app_context():
    init_db()


# ── AUTH ROUTES ─────────────────────────────────────────────────────
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user and user.check_password(request.form['password']):
            login_user(user)
            user.last_login = datetime.utcnow()
            db.session.commit()
            return redirect(url_for('index'))
        flash('Invalid username or password')
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ── MAIN APP ────────────────────────────────────────────────────────
@app.route('/')
@app.route('/<page>')
@login_required
def index(page='dashboard'):
    valid = {'dashboard', 'products', 'warehouse', 'sales', 'analytics', 'settings'}
    if page not in valid:
        page = 'dashboard'
    settings = {s.key: s.value for s in Setting.query.all()}
    return render_template('app.html', page=page, settings=settings, user=current_user)


if __name__ == '__main__':
    app.run(debug=True)
