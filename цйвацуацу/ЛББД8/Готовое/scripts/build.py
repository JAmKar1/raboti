import sqlite3, json, os, sys
base=sys.argv[1]; out=sys.argv[2]
if os.path.exists(out): os.remove(out)
c=sqlite3.connect(out); c.execute('PRAGMA foreign_keys=ON')
c.executescript(open(base+'/schema.sql',encoding='utf8').read())
types={r[1]:r[0] for r in c.execute('select * from тип_контрагента')}
for j in json.load(open(base+'/customers.json',encoding='utf8')):   # импорт Заказчики.json
    c.execute('insert into контрагент values (?,?,?,?,?,?)',(int(j['id']),j['name'],j['inn'].strip() or None,' '.join(j['addres'].split()) or None,j['phone'],types[j['type']]))
c.executescript(open(base+'/seed.sql',encoding='utf8').read())
c.executescript(open(base+'/queries.sql',encoding='utf8').read())
c.commit()
print(c.execute('pragma foreign_key_check').fetchall(), c.execute('pragma integrity_check').fetchall())
for t in ['контрагент','номенклатура','цена','строка_заказа_покупателя']: print(t,c.execute(f'select count(*) from {t}').fetchone())
for r in c.execute('select * from в_стоимость_строки_заказа'): print(r)
for r in c.execute('select * from в_стоимость_заказа'): print(r)
