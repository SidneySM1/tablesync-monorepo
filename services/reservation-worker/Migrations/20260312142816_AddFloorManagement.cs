using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservationWorker.Migrations
{
    /// <inheritdoc />
    public partial class AddFloorManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "table_number",
                table: "reservations");

            migrationBuilder.AddColumn<Guid>(
                name: "restaurant_table_id",
                table: "reservations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "restaurants",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_restaurants", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "sectors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    restaurant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    has_map_layout = table.Column<bool>(type: "boolean", nullable: false),
                    allow_any_table = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sectors", x => x.id);
                    table.ForeignKey(
                        name: "FK_sectors_restaurants_restaurant_id",
                        column: x => x.restaurant_id,
                        principalTable: "restaurants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "restaurant_tables",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sector_id = table.Column<Guid>(type: "uuid", nullable: false),
                    table_number = table.Column<int>(type: "integer", nullable: false),
                    capacity = table.Column<int>(type: "integer", nullable: false),
                    position_x = table.Column<double>(type: "double precision", nullable: false),
                    position_y = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_restaurant_tables", x => x.id);
                    table.ForeignKey(
                        name: "FK_restaurant_tables_sectors_sector_id",
                        column: x => x.sector_id,
                        principalTable: "sectors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_reservations_restaurant_table_id",
                table: "reservations",
                column: "restaurant_table_id");

            migrationBuilder.CreateIndex(
                name: "IX_restaurant_tables_sector_id",
                table: "restaurant_tables",
                column: "sector_id");

            migrationBuilder.CreateIndex(
                name: "IX_sectors_restaurant_id",
                table: "sectors",
                column: "restaurant_id");

            migrationBuilder.AddForeignKey(
                name: "FK_reservations_restaurant_tables_restaurant_table_id",
                table: "reservations",
                column: "restaurant_table_id",
                principalTable: "restaurant_tables",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_reservations_restaurant_tables_restaurant_table_id",
                table: "reservations");

            migrationBuilder.DropTable(
                name: "restaurant_tables");

            migrationBuilder.DropTable(
                name: "sectors");

            migrationBuilder.DropTable(
                name: "restaurants");

            migrationBuilder.DropIndex(
                name: "IX_reservations_restaurant_table_id",
                table: "reservations");

            migrationBuilder.DropColumn(
                name: "restaurant_table_id",
                table: "reservations");

            migrationBuilder.AddColumn<int>(
                name: "table_number",
                table: "reservations",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
