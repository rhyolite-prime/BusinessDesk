using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace TopazERP.EntityFrameworkCore
{
    public static class TopazERPDbContextConfigurer
    {
        public static void Configure(DbContextOptionsBuilder<TopazERPDbContext> builder, string connectionString)
        {
            builder.UseNpgsql(connectionString);
            //builder.UseNpgsql("User ID=postgres;Password=postgres;Server=localhost;Port=5432;Database=topaz_erp;Pooling=true;");

        }

        public static void Configure(DbContextOptionsBuilder<TopazERPDbContext> builder, DbConnection connection)
        {
            builder.UseNpgsql(connection);
        }
    }
}
