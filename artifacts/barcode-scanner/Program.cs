using ClosedXML.Excel;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        ctx.Context.Response.Headers["Pragma"] = "no-cache";
        ctx.Context.Response.Headers["Expires"] = "0";
    }
});

var excelPath = Path.Combine(AppContext.BaseDirectory, "Data", "shampoos.xlsx");

EnsureExcelFileExists(excelPath);

app.MapGet("/api/lookup/{barcode}", (string barcode) =>
{
    try
    {
        if (!File.Exists(excelPath))
            return Results.NotFound(new { message = "Data file not found." });

        using var workbook = new XLWorkbook(excelPath);
        var worksheet = workbook.Worksheet(1);
        var rows = worksheet.RangeUsed()?.RowsUsed();

        if (rows == null)
            return Results.NotFound(new { message = "No data found." });

        foreach (var row in rows.Skip(1))
        {
            var cellBarcode = row.Cell(1).GetString().Trim();
            if (cellBarcode == barcode.Trim())
            {
                var name = row.Cell(2).GetString().Trim();
                var price = row.Cell(3).GetString().Trim();
                return Results.Ok(new { barcode = cellBarcode, name, price });
            }
        }

        return Results.NotFound(new { message = $"Barcode '{barcode}' not found in database." });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error reading data: {ex.Message}");
    }
});

app.Run();

void EnsureExcelFileExists(string path)
{
    var dir = Path.GetDirectoryName(path)!;
    if (!Directory.Exists(dir))
        Directory.CreateDirectory(dir);

    if (File.Exists(path))
        return;

    using var workbook = new XLWorkbook();
    var ws = workbook.Worksheets.Add("Shampoos");

    ws.Cell(1, 1).Value = "Barcode";
    ws.Cell(1, 2).Value = "Name";
    ws.Cell(1, 3).Value = "Price (PKR)";

    ws.Row(1).Style.Font.Bold = true;
    ws.Row(1).Style.Fill.BackgroundColor = XLColor.LightBlue;

    var data = new[]
    {
        ("8901030860009", "Head & Shoulders Classic Clean", "450"),
        ("8901030820140", "Head & Shoulders Anti-Dandruff", "520"),
        ("8901054520014", "Pantene Pro-V Smooth & Silky", "480"),
        ("8901054017957", "Pantene Pro-V Hair Fall Control", "510"),
        ("8714100878413", "Sunsilk Soft & Smooth", "320"),
        ("8714100878420", "Sunsilk Hair Fall Solution", "340"),
        ("8999999000011", "L'Oreal Elvive", "750"),
        ("8999999000028", "Dove Intense Repair", "560"),
        ("8999999000035", "Clear Anti-Dandruff", "400"),
        ("8999999000042", "TRESemme Keratin Smooth", "680"),
    };

    for (int i = 0; i < data.Length; i++)
    {
        ws.Cell(i + 2, 1).Value = data[i].Item1;
        ws.Cell(i + 2, 2).Value = data[i].Item2;
        ws.Cell(i + 2, 3).Value = data[i].Item3;
    }

    ws.Columns().AdjustToContents();
    workbook.SaveAs(path);
}
