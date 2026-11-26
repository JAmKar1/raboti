from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(32), nullable=False, default='teacher')
    full_name = db.Column(db.String(128))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class EquipmentType(db.Model):
    __tablename__ = 'equipment_type'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    items = db.relationship('Equipment', backref='type', lazy=True)


class Location(db.Model):
    __tablename__ = 'location'
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(16), nullable=False)
    building = db.Column(db.String(32))
    name = db.Column(db.String(64))
    items = db.relationship('Equipment', backref='location', lazy=True)


class Employee(db.Model):
    __tablename__ = 'employee'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(128), nullable=False)
    position = db.Column(db.String(64))
    department = db.Column(db.String(64))
    phone = db.Column(db.String(32))
    items = db.relationship('Equipment', backref='employee', lazy=True)


class Equipment(db.Model):
    __tablename__ = 'equipment'
    id = db.Column(db.Integer, primary_key=True)
    inv_number = db.Column(db.String(32), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    type_id = db.Column(db.Integer, db.ForeignKey('equipment_type.id'))
    model = db.Column(db.String(128))
    serial_number = db.Column(db.String(64))
    purchase_date = db.Column(db.Date)
    cost = db.Column(db.Float)
    status = db.Column(db.String(32), default='в эксплуатации')
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'))
    note = db.Column(db.Text)

    requests = db.relationship('RepairRequest', backref='equipment', lazy=True,
                               cascade='all, delete-orphan')
    movements = db.relationship('Movement', backref='equipment', lazy=True,
                                cascade='all, delete-orphan')


class RepairRequest(db.Model):
    __tablename__ = 'repair_request'
    id = db.Column(db.Integer, primary_key=True)
    equipment_id = db.Column(db.Integer, db.ForeignKey('equipment.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), default='новая')
    assigned_to = db.Column(db.Integer, db.ForeignKey('employee.id'))
    closed_at = db.Column(db.DateTime)
    resolution = db.Column(db.Text)


class Movement(db.Model):
    __tablename__ = 'movement'
    id = db.Column(db.Integer, primary_key=True)
    equipment_id = db.Column(db.Integer, db.ForeignKey('equipment.id'), nullable=False)
    from_location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    to_location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    moved_at = db.Column(db.DateTime, default=datetime.utcnow)
    reason = db.Column(db.String(255))

    from_location = db.relationship('Location', foreign_keys=[from_location_id])
    to_location = db.relationship('Location', foreign_keys=[to_location_id])