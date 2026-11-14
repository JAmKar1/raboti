using System;
using System.Data;
using System.Data.OleDb;
using System.Windows.Forms;
using System.Linq;

namespace WindowsFormsApp1 // Убедитесь, что namespace совпадает с вашим
{
    public partial class Form1 : Form
    {
        string dbPath = Application.StartupPath + @"\1.accdb";

        public Form1()
        {
            InitializeComponent();
            dataGridView1.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
            dataGridView1.ReadOnly = true;
            dataGridView1.AllowUserToAddRows = false;
            dataGridView1.RowHeadersVisible = false;
            dataGridView1.SelectionMode = DataGridViewSelectionMode.FullRowSelect;

            DeleteTableSilently("КОПИЯ_КВАРТИРЫ");
            DeleteTableSilently("КВАРТИРЫ_3_КОМН");
        }

        // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---

        private string InputBox(string text, string caption, string defaultValue)
        {
            Form prompt = new Form() { Width = 400, Height = 150, Text = caption, StartPosition = FormStartPosition.CenterScreen, FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false };
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

        private void DeleteTableSilently(string tableName)
        {
            try
            {
                string connString = $@"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={dbPath};";
                using (OleDbConnection conn = new OleDbConnection(connString))
                {
                    conn.Open();
                    new OleDbCommand($"DROP TABLE [{tableName}]", conn).ExecuteNonQuery();
                }
            }
            catch { }
        }

        private bool TableExists(string tableName)
        {
            try
            {
                string connString = $@"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={dbPath};";
                using (OleDbConnection conn = new OleDbConnection(connString))
                {
                    conn.Open();
                    new OleDbCommand($"SELECT TOP 1 * FROM [{tableName}]", conn).ExecuteScalar();
                    return true;
                }
            }
            catch { return false; }
        }

        private void LoadData(string query)
        {
            try
            {
                dataGridView1.DataSource = null;
                dataGridView1.Columns.Clear();
                string connString = $@"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={dbPath};";
                using (OleDbConnection conn = new OleDbConnection(connString))
                {
                    conn.Open();
                    OleDbDataAdapter adapter = new OleDbDataAdapter(query, conn);
                    DataTable dt = new DataTable();
                    adapter.Fill(dt);
                    dataGridView1.DataSource = dt;
                }
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
        }

        private void ExecuteActionWithResult(string query, string actionName)
        {
            try
            {
                string connString = $@"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={dbPath};";
                using (OleDbConnection conn = new OleDbConnection(connString))
                {
                    conn.Open();
                    int rowsAffected = new OleDbCommand(query, conn).ExecuteNonQuery();
                    MessageBox.Show($"Успешно! {actionName}. Затронуто строк: {rowsAffected}");
                }
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
        }

        private DataTable GetTable(string tableName)
        {
            string connString = $@"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={dbPath};";
            using (OleDbConnection conn = new OleDbConnection(connString))
            {
                conn.Open();
                OleDbDataAdapter adapter = new OleDbDataAdapter($"SELECT * FROM [{tableName}]", conn);
                DataTable dt = new DataTable();
                adapter.Fill(dt);
                return dt;
            }
        }

        // --- ГЛАВНЫЕ КНОПКИ ---
        private void button1_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Квартиры]"); }
        private void button2_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Риэлторы]"); }
        private void button3_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Сделки]"); }

        // --- ЗАПРОСЫ 1-8 ---

        private void button4_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [1]"); }

        // ЗАПРОС 2: Ищем риэлторов на "И" с процентом > 10
        private void button5_Click(object sender, EventArgs e)
        {
            try
            {
                DataTable dtRiel = GetTable("Риэлторы");
                DataTable dtSdel = GetTable("Сделки");

                // Связываем по id_риэлтор (в Риэлторах это 1-й столбец, в Сделках - 3-й столбец (индекс 2))
                var result = from r in dtRiel.AsEnumerable()
                             join s in dtSdel.AsEnumerable() on r["id_риэлтор"].ToString() equals s["id_риэлтора"].ToString()
                             where r["ФИО"].ToString().StartsWith("И") && Convert.ToDouble(s["Процент вознаграждения"]) > 10
                             select new { ФИО = r["ФИО"], Процент = s["Процент вознаграждения"] };

                if (result.Any()) dataGridView1.DataSource = result.ToList();
                else MessageBox.Show("Нет данных");
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
        }

        private void button6_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [3]"); }

        // ЗАПРОС 4: Количество комнат
        private void button7_Click(object sender, EventArgs e)
        {
            try
            {
                string input = InputBox("Введите количество комнат:", "Запрос 4", "2");
                if (!int.TryParse(input, out int rooms)) return;

                DataTable dt = GetTable("Квартиры");

                var result = dt.AsEnumerable().Where(row =>
                    row["Количество комнат"] != DBNull.Value &&
                    Convert.ToInt32(row["Количество комнат"]) == rooms);

                if (result.Any()) dataGridView1.DataSource = result.CopyToDataTable();
                else MessageBox.Show("Ничего не найдено");
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
        }

        // ЗАПРОС 5: Площадь от и до (2-комнатные)
        private void button8_Click(object sender, EventArgs e)
        {
            try
            {
                string inputMin = InputBox("Введите минимальную площадь:", "Запрос 5", "10");
                string inputMax = InputBox("Введите максимальную площадь:", "Запрос 5", "70");
                if (!int.TryParse(inputMin, out int min) || !int.TryParse(inputMax, out int max)) return;

                DataTable dt = GetTable("Квартиры");

                var result = dt.AsEnumerable().Where(row =>
                    row["Количество комнат"] != DBNull.Value && Convert.ToInt32(row["Количество комнат"]) == 2 &&
                    row["Площадь квартиры"] != DBNull.Value &&
                    Convert.ToDouble(row["Площадь квартиры"]) >= min &&
                    Convert.ToDouble(row["Площадь квартиры"]) <= max);

                if (result.Any()) dataGridView1.DataSource = result.CopyToDataTable();
                else MessageBox.Show("Ничего не найдено");
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
        }

        // Запросы 6, 7, 8 (выводим базовые таблицы, чтобы не было ошибки параметров)
        private void button9_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Квартиры]"); }
        private void button10_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Сделки]"); }
        private void button11_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Риэлторы]"); }

        // Если у вас есть 12-я кнопка
        private void button12_Click(object sender, EventArgs e) { LoadData("SELECT * FROM [Квартиры]"); }

        // --- КНОПКИ ПРОСМОТРА (ВНИЗУ) ---
        private void button13_Click_1(object sender, EventArgs e)
        {
            if (TableExists("КВАРТИРЫ_3_КОМН")) LoadData("SELECT * FROM [КВАРТИРЫ_3_КОМН]");
            else MessageBox.Show("Таблица еще не создана. Нажмите Создание 3_КОМН.");
        }

        private void button14_Click_1(object sender, EventArgs e)
        {
            if (TableExists("КОПИЯ_КВАРТИРЫ")) LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
            else MessageBox.Show("Таблица еще не создана. Нажмите Создание Копия.");
        }

        // --- СОЗДАНИЕ, УДАЛЕНИЕ, ОБНОВЛЕНИЕ ---

        // Кнопка "Создание 3_КОМН"
        private void button15_Click(object sender, EventArgs e)
        {
            DeleteTableSilently("КВАРТИРЫ_3_КОМН");
            ExecuteActionWithResult("SELECT * INTO [КВАРТИРЫ_3_КОМН] FROM [Квартиры] WHERE [Количество комнат] = 3", "Создание таблицы");
            LoadData("SELECT * FROM [КВАРТИРЫ_3_КОМН]");
        }

        // Кнопка "Создание Копия" (+ улица Луговая)
        private void button16_Click(object sender, EventArgs e)
        {
            DeleteTableSilently("КОПИЯ_КВАРТИРЫ");
            try
            {
                string connString = $@"Provider=Microsoft.ACE.OLEDB.12.0;Data Source={dbPath};";
                using (OleDbConnection conn = new OleDbConnection(connString))
                {
                    conn.Open();
                    // 1. Копируем все квартиры
                    new OleDbCommand("SELECT * INTO [КОПИЯ_КВАРТИРЫ] FROM [Квартиры]", conn).ExecuteNonQuery();

                    // 2. Добавляем Луговую, используя точные названия колонок (через пробелы)
                    string sqlInsert = @"INSERT INTO [КОПИЯ_КВАРТИРЫ] 
                                         ([id_квартиры], [Название улицы], [Номер дома], [Номер квартиры], [Площадь квартиры], [Количество комнат], [Цена квартиры])
                                         SELECT MAX([id_квартиры]) + 1, 'Луговая', 9, 1, 45, 10, 6000000 FROM [КОПИЯ_КВАРТИРЫ]";
                    new OleDbCommand(sqlInsert, conn).ExecuteNonQuery();

                    MessageBox.Show("Копия успешно создана!");
                }
            }
            catch (Exception ex) { MessageBox.Show("Ошибка: " + ex.Message); }
            LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
        }

        // Кнопка "Удаление" (удаляем Садовую)
        private void button17_Click(object sender, EventArgs e)
        {
            ExecuteActionWithResult("DELETE FROM [КОПИЯ_КВАРТИРЫ] WHERE [Название улицы] = 'Садовая'", "Удаление");
            LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
        }

        // Кнопка "Обновление" (Луговая -> Рябиновая)
        private void button18_Click(object sender, EventArgs e)
        {
            ExecuteActionWithResult("UPDATE [КОПИЯ_КВАРТИРЫ] SET [Название улицы] = 'Рябиновая' WHERE [Название улицы] = 'Луговая'", "Обновление");
            LoadData("SELECT * FROM [КОПИЯ_КВАРТИРЫ]");
        }
    }
}