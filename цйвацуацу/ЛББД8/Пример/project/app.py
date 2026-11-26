import os

# Фикс для OpenBLAS (чтобы не было ошибки Memory allocation)
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

import io
from datetime import datetime
from functools import wraps

import qrcode
from flask import (Flask, render_template, request, redirect, url_for,
                   flash, send_file, abort)
from flask_login import (LoginManager, login_user, logout_user,
                         login_required, current_user)
from openpyxl import Workbook

from models import (db, User, Equipment, EquipmentType, Location,
                    Employee, RepairRequest, Movement)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, 'instance')
os.makedirs(INSTANCE_DIR, exist_ok=True)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'change-me-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(INSTANCE_DIR, 'utt.sqlite')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role not in roles:
                abort(403)
            return f(*args, **kwargs)

        return wrapper

    return decorator


# ---------- Авторизация ----------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(login=request.form['login']).first()
        if user and user.check_password(request.form['password']):
            login_user(user)
            return redirect(url_for('index'))
        flash('Неверный логин или пароль', 'danger')
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))


# ---------- Главная ----------
@app.route('/')
@login_required
def index():
    stats = {
        'total': Equipment.query.count(),
        'in_use': Equipment.query.filter_by(status='в эксплуатации').count(),
        'in_repair': Equipment.query.filter_by(status='на ремонте').count(),
        'written_off': Equipment.query.filter_by(status='списано').count(),
        'open_requests': RepairRequest.query.filter(
            RepairRequest.status.in_(['новая', 'в работе'])).count(),
    }
    return render_template('index.html', stats=stats)


# ---------- Техника ----------
@app.route('/equipment')
@login_required
def equipment_list():
    q = request.args.get('q', '').strip()
    status = request.args.get('status', '')
    type_id = request.args.get('type_id', type=int) or None

    query = Equipment.query
    if q:
        query = query.filter(db.or_(
            Equipment.inv_number.ilike(f'%{q}%'),
            Equipment.name.ilike(f'%{q}%'),
            Equipment.model.ilike(f'%{q}%'),
        ))
    if status:
        query = query.filter_by(status=status)
    if type_id:
        query = query.filter_by(type_id=type_id)

    items = query.order_by(Equipment.inv_number).all()
    return render_template('equipment_list.html', items=items,
                           types=EquipmentType.query.all(), q=q,
                           status=status, type_id=type_id)


@app.route('/equipment/add', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'storekeeper')
def equipment_add():
    if request.method == 'POST':
        inv = request.form['inv_number'].strip()
        if Equipment.query.filter_by(inv_number=inv).first():
            flash('Инвентарный номер уже существует', 'danger')
            return redirect(url_for('equipment_add'))
        eq = Equipment(
            inv_number=inv,
            name=request.form['name'].strip(),
            type_id=int(request.form['type_id']) if request.form.get('type_id') else None,
            model=request.form.get('model') or None,
            serial_number=request.form.get('serial_number') or None,
            status=request.form.get('status', 'в эксплуатации'),
            location_id=int(request.form['location_id']) if request.form.get('location_id') else None,
            employee_id=int(request.form['employee_id']) if request.form.get('employee_id') else None,
            note=request.form.get('note') or None,
        )
        pd = request.form.get('purchase_date')
        if pd:
            eq.purchase_date = datetime.strptime(pd, '%Y-%m-%d').date()
        cost = request.form.get('cost')
        if cost:
            eq.cost = float(cost)
        db.session.add(eq)
        db.session.commit()
        flash('Техника добавлена', 'success')
        return redirect(url_for('equipment_list'))
    return render_template('equipment_form.html', item=None,
                           types=EquipmentType.query.all(),
                           locations=Location.query.all(),
                           employees=Employee.query.all())


@app.route('/equipment/<int:eq_id>')
@login_required
def equipment_card(eq_id):
    eq = db.session.get(Equipment, eq_id) or abort(404)
    return render_template('equipment_card.html', item=eq)


@app.route('/equipment/<int:eq_id>/edit', methods=['GET', 'POST'])
@login_required
@role_required('admin', 'storekeeper')
def equipment_edit(eq_id):
    eq = db.session.get(Equipment, eq_id) or abort(404)
    if request.method == 'POST':
        eq.inv_number = request.form['inv_number'].strip()
        eq.name = request.form['name'].strip()
        eq.type_id = int(request.form['type_id']) if request.form.get('type_id') else None
        eq.model = request.form.get('model') or None
        eq.serial_number = request.form.get('serial_number') or None
        eq.status = request.form.get('status', eq.status)
        eq.location_id = int(request.form['location_id']) if request.form.get('location_id') else None
        eq.employee_id = int(request.form['employee_id']) if request.form.get('employee_id') else None
        eq.note = request.form.get('note') or None
        pd = request.form.get('purchase_date')
        eq.purchase_date = datetime.strptime(pd, '%Y-%m-%d').date() if pd else None
        cost = request.form.get('cost')
        eq.cost = float(cost) if cost else None
        db.session.commit()
        flash('Изменения сохранены', 'success')
        return redirect(url_for('equipment_card', eq_id=eq.id))
    return render_template('equipment_form.html', item=eq,
                           types=EquipmentType.query.all(),
                           locations=Location.query.all(),
                           employees=Employee.query.all())


@app.route('/equipment/<int:eq_id>/delete', methods=['POST'])
@login_required
@role_required('admin')
def equipment_delete(eq_id):
    eq = db.session.get(Equipment, eq_id) or abort(404)
    db.session.delete(eq)
    db.session.commit()
    flash('Техника удалена', 'info')
    return redirect(url_for('equipment_list'))


@app.route('/equipment/<int:eq_id>/qr.png')
@login_required
def equipment_qr(eq_id):
    eq = db.session.get(Equipment, eq_id) or abort(404)
    img = qrcode.make(f"INV:{eq.inv_number};NAME:{eq.name}")
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return send_file(buf, mimetype='image/png')


@app.route('/equipment/<int:eq_id>/move', methods=['POST'])
@login_required
@role_required('admin', 'storekeeper')
def equipment_move(eq_id):
    eq = db.session.get(Equipment, eq_id) or abort(404)
    new_loc = request.form.get('to_location_id')
    reason = request.form.get('reason', '')
    if new_loc:
        mv = Movement(equipment_id=eq.id,
                      from_location_id=eq.location_id,
                      to_location_id=int(new_loc),
                      reason=reason)
        eq.location_id = int(new_loc)
        db.session.add(mv)
        db.session.commit()
        flash('Перемещение зафиксировано', 'success')
    return redirect(url_for('equipment_card', eq_id=eq.id))


# ---------- Заявки ----------
@app.route('/requests')
@login_required
def requests_list():
    items = RepairRequest.query.order_by(RepairRequest.created_at.desc()).all()
    return render_template('requests.html', items=items)


@app.route('/requests/add', methods=['GET', 'POST'])
@login_required
def request_add():
    if request.method == 'POST':
        eq_id = request.form.get('equipment_id')
        if not eq_id:
            flash('Выберите технику', 'danger')
            return redirect(url_for('request_add'))

        rr = RepairRequest(equipment_id=int(eq_id),
                           description=request.form['description'].strip())
        db.session.add(rr)

        eq = db.session.get(Equipment, int(eq_id))
        if eq and eq.status == 'в эксплуатации':
            eq.status = 'на ремонте'

        db.session.commit()
        flash('Заявка успешно создана!', 'success')
        return redirect(url_for('requests_list'))

    equipment_list = Equipment.query.order_by(Equipment.inv_number).all()
    return render_template('request_form.html', equipment=equipment_list)


@app.route('/requests/<int:rid>/close', methods=['POST'])
@login_required
@role_required('admin', 'engineer')
def request_close(rid):
    rr = db.session.get(RepairRequest, rid)
    if not rr:
        abort(404)

    rr.status = 'выполнена'
    rr.closed_at = datetime.utcnow()
    rr.resolution = request.form.get('resolution', '')

    if rr.equipment and rr.equipment.status == 'на ремонте':
        rr.equipment.status = 'в эксплуатации'

    db.session.commit()
    flash('Заявка закрыта, ремонт выполнен!', 'success')
    return redirect(url_for('requests_list'))


# ---------- Отчёты ----------
@app.route('/reports')
@login_required
def reports():
    by_status = db.session.query(Equipment.status, db.func.count(Equipment.id)) \
        .group_by(Equipment.status).all()
    by_location = db.session.query(Location.number, db.func.count(Equipment.id)) \
        .outerjoin(Equipment).group_by(Location.id).all()
    return render_template('reports.html', by_status=by_status, by_location=by_location)


@app.route('/reports/export.xlsx')
@login_required
def reports_export():
    wb = Workbook()
    ws = wb.active
    ws.title = 'Техника'
    ws.append(['Инв. номер', 'Наименование', 'Тип', 'Модель',
               'Статус', 'Кабинет', 'Ответственный'])
    for eq in Equipment.query.order_by(Equipment.inv_number).all():
        ws.append([
            eq.inv_number, eq.name,
            eq.type.name if eq.type else '',
            eq.model or '',
            eq.status,
            eq.location.number if eq.location else '',
            eq.employee.full_name if eq.employee else '',
        ])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return send_file(buf, as_attachment=True,
                     download_name='equipment_report.xlsx',
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


# ---------- Пользователи (админ) ----------
@app.route('/users', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def users():
    if request.method == 'POST':
        login_val = request.form['login'].strip()
        if User.query.filter_by(login=login_val).first():
            flash('Логин занят', 'danger')
        else:
            u = User(login=login_val,
                     role=request.form['role'],
                     full_name=request.form.get('full_name', ''))
            u.set_password(request.form['password'])
            db.session.add(u)
            db.session.commit()
            flash('Пользователь создан', 'success')
        return redirect(url_for('users'))
    return render_template('users.html', users=User.query.all())


# ---------- Инициализация БД и демо-данные ----------
def init_db():
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(login='admin').first():
            admin = User(login='admin', role='admin', full_name='Администратор')
            admin.set_password('admin123')
            db.session.add(admin)
        if EquipmentType.query.count() == 0:
            for n in ['ПК', 'Ноутбук', 'Проектор', 'МФУ', 'Интерактивная панель', 'Сервер']:
                db.session.add(EquipmentType(name=n))
        if Location.query.count() == 0:
            for num, bld in [('201', 'Корпус 1'), ('305', 'Корпус 1'),
                             ('101', 'Корпус 2'), ('Актовый зал', 'Корпус 2')]:
                db.session.add(Location(number=num, building=bld))
        if Employee.query.count() == 0:
            db.session.add(Employee(full_name='Иванов Иван Иванович',
                                    position='Инженер-электроник',
                                    department='АХЧ'))
            db.session.add(Employee(full_name='Петрова Анна Сергеевна',
                                    position='Заведующая кабинетом',
                                    department='ИТ'))
        db.session.commit()


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='127.0.0.1', port=5000)
