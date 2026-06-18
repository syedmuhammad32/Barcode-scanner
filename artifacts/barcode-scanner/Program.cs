using ClosedXML.Excel;
using System.Text.RegularExpressions;

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

var excelPath = Path.Combine(Directory.GetCurrentDirectory(), "Data", "shampoos.xlsx");

app.MapGet("/api/lookup/{barcode}", (string barcode) =>
{
    try
    {
        if (!File.Exists(excelPath))
            return Results.NotFound(new { message = $"Data file not found at: {excelPath}" });

        using var workbook = new XLWorkbook(excelPath);
        var worksheet = workbook.Worksheet(1);
        var rows = worksheet.RangeUsed()?.RowsUsed();

        if (rows == null)
            return Results.NotFound(new { message = "Excel file mein koi data nahi mila." });

        var search = barcode.Trim();

        foreach (var row in rows.Skip(1))
        {
            var col1 = row.Cell(1).GetString().Trim();
            var col2 = row.Cell(2).GetString().Trim();

            if (col1 == search || col2 == search)
            {
                var name = row.Cell(3).GetString().Trim();
                var priceBreakdown = row.Cell(6).GetString().Trim();
                var conversionVal = row.Cell(5).GetString().Trim();

                string price;
                if (!string.IsNullOrEmpty(priceBreakdown))
                {
                    var match = Regex.Match(priceBreakdown, @"Rs\.\s*([\d,.]+)", RegexOptions.IgnoreCase);
                    price = match.Success ? $"Rs. {match.Groups[1].Value}" : priceBreakdown;
                }
                else if (!string.IsNullOrEmpty(conversionVal) && double.TryParse(conversionVal, out var conv))
                {
                    price = $"Rs. {conv:F2}";
                }
                else
                {
                    price = "Price available nahi";
                }

                return Results.Ok(new
                {
                    barcode = search,
                    materialCode = col2,
                    name,
                    price,
                    capacity = row.Cell(4).GetString().Trim()
                });
            }
        }

        return Results.NotFound(new { message = $"'{search}' database mein nahi mila." });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error reading data: {ex.Message}");
    }
});

app.Run();
