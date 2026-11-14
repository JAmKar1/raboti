using System;
using System.Data;
using System.Data.OleDb;
using System.Windows.Forms;
using System.Linq;

namespace kvartira
{
    public partial class Form1 : Form
    {
        // Строка подключения
        string connectionString = @"Provider=Microsoft.ACE.OLEDB.12.0;Data Source=1.accdb";

        public Form1()
        {
            InitializeComponent();

            // Настройка DataGridView для красивого отображения
            dataGridView1.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridView1.ReadOnly = true;
            dataGridView1.AllowUserToAddRows = false;
            dataGridView1.RowHeadersVisible = false;
            dataGridView1.SelectionMode = DataGridViewSelectionMode.FullRowSelect;

            // Удаляем временные таблицы при запуске, чтобы избежать ошибок "таблица уже существует"
            DeleteTableSilently("КВАРТИРЫ_3_КОМН");
            DeleteTableSilently("КОПИЯ_КВАРТИРЫ");
        }

        // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---

        private void LoadData(string sqlQuery)
        {
            try
            {
                dataGridView1.DataSource = null;
                dataGridView1.Columns.Clear();

                using (OleDbConnection conn = new OleDbConnection(connectionString))
                {
                    conn.Open();
                    OleDbDataAdapter adapter = new OleDbDataAdapter(sqlQuery, conn);
                    DataTable dt = new DataTable();
                    adapter.Fill(dt);
                    dataGridView1.DataSource = dt;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Ошибка загрузки данных:\n" + ex.Message);
            }
        }

        private void ExecuteAction(string sqlQuery, string actionName)
        {
            try
            {
                using (OleDbConnection conn = new OleDbConnection(connectionString))
                {
                    conn.Open();
                    OleDbCommand cmd = new OleDbCommand(sqlQuery, conn);
                    int rows = cmd.ExecuteNonQuery();
                    MessageBox.Show($"Успешно! {actionName}. Затронуто строк: {rows}");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Ошибка выполнения действия:\n" + ex.Message);
            }
        }

        private void DeleteTableSilently(string tableName)
        {
            try
            {
                using (OleDbConnection conn = new OleDbConnection(connectionString))
                {
                    conn.Open();
                    OleDbCommand cmd = new OleDbCommand($"DROP TABLE [{tableName}]", conn);
                    cmd.ExecuteNonQuery();
                }
            }
            catch { } // Игнорируем ошибку, если таблицы нет
        }

        private bool TableExists(string tableName)
        {
            try
            {
                using (OleDbConnection conn = new OleDbConnection(connectionString))
                {
                    conn.Open();
                    OleDbCommand cmd = new OleDbCommand($"SELECT TOP 1 * FROM [{tableName}]", conn);
                    cmd.ExecuteScalar();
                    return true;
                }
            }
            catch { return false; }
        }

        private DataTable GetTable(string tableName)
        {
            using (OleDbConnection conn = new OleDbConnection(connectionString))
            {
                conn.Open();
                OleDbDataAdapter adapter = new OleDbDataAdapter($"SELECT * FROM [{tableName}]", conn);
                DataTable dt = new DataTable();
                adapter.Fill(dt);
                return dt;
            }
        }

        private string InputBox(string text, string caption, string defaultValue)
        {
            Form prompt = new Form()
            {
                Width = 400,
                Height = 150,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                Text = caption,
                StartPosition = FormStartPosition.CenterScreen,
                MaximizeBox = false,
                MinimizeBox = false
            };
            Label textLabel = new Label() { Left = 20, Top = 20, Text = text, Width = 350 };
            TextBox textBox = new TextBox() { Left = 20, Top = 50, Width = 340, Text = defaultValue };
            Button confirmation = new Button() { Text = "ОК", Left = 260, Width = 100, Top = 80, DialogResult = DialogResult.OK };
            confirmation.Click += (sender, e) => { prompt.Close(); };

            prompt.Controls.Add(textBox);
            prompt.Controls.Add(confirmation);
            prompt.Controls.Add(textLabel);
            prompt.AcceptButton = confirmation;

            return prompt.ShowDialog() == DialogResult.OK ? textBox.Text : "";
        }

        // --- ОБРАБОТЧИКИ КНОПОК ---

        // ГЛАВНЫЕ ТАБЛИЦЫ
        private void button1_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Квартиры]"); }
        private void button2_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Риэлторы]"); }
        private void button3_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Сделки]"); }

        // ЗАПРОСЫ 1-12 (начинаются с button6)

        // Запрос 1
        private void button6_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Запрос 1]"); }

        // Запрос 2 (LINQ: Риэлторы на букву "И" и процент > 10)
        private void button7_Click(object sender, EventArgs e)
        {
            try
            {
                DataTable dtRiel = GetTable("Риэлторы");
                DataTable dtSdel = GetTable("Сделки");

                // Берем имя последнего столбца (обычно это Процент)
                string percentCol = dtSdel.Columns[dtSdel.Columns.Count - 1].ColumnName;

                var result = from r in dtRiel.AsEnumerable()
                             join s in dtSdel.AsEnumerable() on r.Field<int>("ID_риэлтора") equals s.Field<int>("ID_риэлтора")
                             where r.Field<string>("ФИО_риэлтора").StartsWith("И") && Convert.ToDouble(s[percentCol]) > 10
                             select new { ФИО = r["ФИО_риэлтора"], Процент = s[percentCol] };

                if (result.Any()) dataGridView1.DataSource = result.ToList();
                else MessageBox.Show("Нет совпадений по условию.");
            }
            catch (Exception ex) { MessageBox.Show("Ошибка в LINQ запросе: " + ex.Message); }
        }

        // Запрос 3
        private void button8_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Запрос 3]"); }

        // Запрос 4 (Параметр: кол-во комнат)
        private void button9_Click(object sender, EventArgs e)
        {
            string input = InputBox("Введите количество комнат:", "Запрос 4", "2");
            if (string.IsNullOrEmpty(input)) return;
            if (!int.TryParse(input, out int rooms)) { MessageBox.Show("Введите целое число."); return; }

            try
            {
                DataTable dt = GetTable("Квартиры");
                var result = dt.AsEnumerable().Where(row => row.Field<int?>("Количество_комнат") == rooms);

                if (result.Any()) dataGridView1.DataSource = result.CopyToDataTable();
                else MessageBox.Show("Ничего не найдено.");
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
        }

        // Запрос 5 (Параметры: площадь от/до для 2-комнатных)
        private void button10_Click(object sender, EventArgs e)
        {
            string minStr = InputBox("Минимальная площадь:", "Запрос 5", "30");
            if (string.IsNullOrEmpty(minStr)) return;
            string maxStr = InputBox("Максимальная площадь:", "Запрос 5", "60");
            if (string.IsNullOrEmpty(maxStr)) return;

            if (!int.TryParse(minStr, out int min) || !int.TryParse(maxStr, out int max))
            {
                MessageBox.Show("Введите корректные числа."); return;
            }

            try
            {
                DataTable dt = GetTable("Квартиры");
                var result = dt.AsEnumerable().Where(row =>
                    row.Field<int?>("Количество_комнат") == 2 &&
                    row.Field<int?>("Площадь_квартиры") >= min &&
                    row.Field<int?>("Площадь_квартиры") <= max);

                if (result.Any()) dataGridView1.DataSource = result.CopyToDataTable();
                else MessageBox.Show("Ничего не найдено.");
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
        }

        // Запросы 6-8 (Простые SELECT из Access)
        private void button11_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Запрос 6]"); }
        private void button12_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Запрос 7]"); }
        private void button13_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Запрос 8]"); }

        // Запрос 9 (Создание таблицы 3-комнатных)
        private void button14_Click(object sender, EventArgs e)
        {
            DeleteTableSilently("КВАРТИРЫ_3_КОМН");
            ExecuteAction("SELECT * INTO [КВАРТИРЫ_3_КОМН] FROM [Квартиры] WHERE [Количество_комнат] = 3", "Создана таблица 3-комнатных квартир");
            LoadData("SELECT * FROM [КВАРТИРЫ_3_КОМН]");
        }

        // Запрос 10 (Создание копии + добавление записи)
        private void button15_Click(object sender, EventArgs e)
        {
            DeleteTableSilently("КОПИЯ_КВАРТИРЫ");
            try
            {
                using (OleDbConnection conn = new OleDbConnection(connectionString))
                {
                    conn.Open();
                    // 1. Копируем структуру и данные
                    new OleDbCommand("SELECT * INTO [КОПИЯ_КВАРТИРЫ] FROM [Квартиры]", conn).ExecuteNonQuery();

                    // 2. Добавляем новую запись (Луговая)
                    // NZ нужен, чтобы если таблица пуста, MAX вернул 0, а не NULL
                    string sqlInsert = @"INSERT INTO [КОПИЯ_КВАРТИРЫ] 
                                         ([ID_Квартиры], [Название_улицы], [Номер_дома], [Номер_квартиры], [Количество_комнат], [Площадь_квартиры], [Этаж])
                                         SELECT NZ(MAX([ID_Квартиры]), 0) + 1, 'Луговая', 9, 1, 10, 45, 2 FROM [КОПИЯ_КВАРТИРЫ]";
                    new OleDbCommand(sqlInsert, conn).ExecuteNonQuery();

                    MessageBox.Show("Копия создана и добавлена улица Луговая!");
                }
            }
            catch (Exception ex) { MessageBox.Show("Ошибка создания копии: " + ex.Message); }

            LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
        }

        // Запрос 11 (Удаление Садовой)
        private void button16_Click(object sender, EventArgs e)
        {
            ExecuteAction("DELETE FROM [КОПИЯ_КВАРТИРЫ] WHERE [Название_улицы] = 'Садовая'", "Удалены квартиры на ул. Садовая");
            LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
        }

        // Запрос 12 (Обновление Луговая -> Рябиновая)
        private void button17_Click(object sender, EventArgs e)
        {
            ExecuteAction("UPDATE [КОПИЯ_КВАРТИРЫ] SET [Название_улицы] = 'Рябиновая' WHERE [Название_улицы] = 'Луговая'", "Улица переименована в Рябиновую");
            LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
        }

        // НИЖНИЕ КНОПКИ ПРОСМОТРА
        private void btnView3Komn_Click(object sender, EventArgs e) // Кнопка "3-к квартиры"
        {
            if (TableExists("КВАРТИРЫ_3_КОМН"))
                LoadData("SELECT * FROM [КВАРТИРЫ_3_КОМН]");
            else
                MessageBox.Show("Таблица еще не создана. Выполните Запрос 9 (button14).");
        }

        private void btnViewCopy_Click(object sender, EventArgs e) // Кнопка "Копия таблицы квартиры"
        {
            if (TableExists("КОПИЯ_КВАРТИРЫ"))
                LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
            else
                MessageBox.Show("Таблица еще не создана. Выполните Запрос 10 (button15).");
        }

        private void button5_Click(object sender, EventArgs e)
        {

        }
    }
}