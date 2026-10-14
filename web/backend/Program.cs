using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using WebBackend.Data;
using WebBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================================
// 1. DATABASE CONNECTION CONFIGURATION
// ============================================================
// Ưu tiên đọc biến môi trường từ Docker, nếu không có sẽ lấy từ appsettings
var dbHost = Environment.GetEnvironmentVariable("DB_HOST");
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "3306";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "thesweets_db";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "user";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "123";

string connectionString;
if (!string.IsNullOrEmpty(dbHost))
{
    connectionString = $"Server={dbHost};Port={dbPort};Database={dbName};User={dbUser};Password={dbPassword};CharSet=utf8mb4";
}
else
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Server=localhost;Port=3308;Database=thesweets_db;User=user;Password=123;CharSet=utf8mb4";
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var serverVersion = new MariaDbServerVersion(new Version(10, 11, 0));
    options.UseMySql(connectionString, serverVersion, mySqlOptions =>
    {
        mySqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorNumbersToAdd: null);
    });
});

// ============================================================
// 2. JWT AUTHENTICATION CONFIGURATION
// ============================================================
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "TheSweetsJwtSecretKey2026SuperSecureRandomString!@#";
var issuer = jwtSettings["Issuer"] ?? "TheSweets.WebBackend";
var audience = jwtSettings["Audience"] ?? "TheSweets.WebApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidIssuer = issuer,
        ValidateAudience = true,
        ValidAudience = audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ============================================================
// 3. DEPENDENCY INJECTION (SERVICES)
// ============================================================
builder.Services.AddScoped<IJwtService, JwtService>();

// ============================================================
// 4. CORS CONFIGURATION (Frontend React -> Backend C#)
// ============================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:5173",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173"
              )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ============================================================
// 5. CONTROLLER & API DISCOVERY
// ============================================================
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ============================================================
// 6. SWAGGER / OPENAPI CONFIGURATION
// ============================================================
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "The Sweets — Web Backend API",
        Version = "v1",
        Description = "Hệ thống API Backend quản lý và bán bánh The Sweets (ASP.NET Core 8.0)"
    });

    // Thêm hỗ trợ kiểm tra Bearer Token trên Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập JWT token theo cú pháp: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ============================================================
// 7. HTTP REQUEST PIPELINE (MIDDLEWARE)
// ============================================================
// Luôn bật Swagger để dễ dàng kiểm thử API trong quá trình phát triển
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "The Sweets API v1");
    c.RoutePrefix = "swagger"; // Truy cập tại http://localhost:5000/swagger
});

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// Route controller
app.MapControllers();

// Health check endpoint trực tiếp
app.MapGet("/", () => Results.Ok(new
{
    message = "🍰 The Sweets Web Backend API is running successfully!",
    swagger = "http://localhost:5000/swagger",
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

app.Run();
