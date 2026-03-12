using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservationWorker.Migrations
{
    /// <inheritdoc />
    public partial class AddTimeSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "time_slots",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    restaurant_table_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    end_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_time_slots", x => x.id);
                    table.ForeignKey(
                        name: "FK_time_slots_restaurant_tables_restaurant_table_id",
                        column: x => x.restaurant_table_id,
                        principalTable: "restaurant_tables",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_time_slots_restaurant_table_id",
                table: "time_slots",
                column: "restaurant_table_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "time_slots");
        }
    }
}
