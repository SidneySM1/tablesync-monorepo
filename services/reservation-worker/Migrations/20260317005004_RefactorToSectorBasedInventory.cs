using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReservationWorker.Migrations
{
    /// <inheritdoc />
    public partial class RefactorToSectorBasedInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_reservations_restaurant_tables_restaurant_table_id",
                table: "reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_restaurant_tables_sectors_sector_id",
                table: "restaurant_tables");

            migrationBuilder.DropForeignKey(
                name: "FK_sectors_restaurants_restaurant_id",
                table: "sectors");

            migrationBuilder.DropForeignKey(
                name: "FK_time_slots_restaurant_tables_restaurant_table_id",
                table: "time_slots");

            migrationBuilder.DropPrimaryKey(
                name: "PK_sectors",
                table: "sectors");

            migrationBuilder.DropPrimaryKey(
                name: "PK_reservations",
                table: "reservations");

            migrationBuilder.DropIndex(
                name: "IX_reservations_restaurant_table_id",
                table: "reservations");

            migrationBuilder.DropPrimaryKey(
                name: "PK_time_slots",
                table: "time_slots");

            migrationBuilder.RenameTable(
                name: "sectors",
                newName: "Sectors");

            migrationBuilder.RenameTable(
                name: "reservations",
                newName: "Reservations");

            migrationBuilder.RenameTable(
                name: "time_slots",
                newName: "TimeSlots");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "Sectors",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Sectors",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "restaurant_id",
                table: "Sectors",
                newName: "RestaurantId");

            migrationBuilder.RenameColumn(
                name: "has_map_layout",
                table: "Sectors",
                newName: "HasMapLayout");

            migrationBuilder.RenameColumn(
                name: "allow_any_table",
                table: "Sectors",
                newName: "AllowAnyTable");

            migrationBuilder.RenameIndex(
                name: "IX_sectors_restaurant_id",
                table: "Sectors",
                newName: "IX_Sectors_RestaurantId");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Reservations",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "restaurant_table_id",
                table: "Reservations",
                newName: "RestaurantTableId");

            migrationBuilder.RenameColumn(
                name: "reservation_date",
                table: "Reservations",
                newName: "ReservationDate");

            migrationBuilder.RenameColumn(
                name: "guest_count",
                table: "Reservations",
                newName: "GuestCount");

            migrationBuilder.RenameColumn(
                name: "customer_phone",
                table: "Reservations",
                newName: "CustomerPhone");

            migrationBuilder.RenameColumn(
                name: "customer_name",
                table: "Reservations",
                newName: "CustomerName");

            migrationBuilder.RenameColumn(
                name: "customer_email",
                table: "Reservations",
                newName: "CustomerEmail");

            migrationBuilder.RenameColumn(
                name: "created_at",
                table: "Reservations",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "TimeSlots",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "start_time",
                table: "TimeSlots",
                newName: "StartTime");

            migrationBuilder.RenameColumn(
                name: "restaurant_table_id",
                table: "TimeSlots",
                newName: "RestaurantTableId");

            migrationBuilder.RenameColumn(
                name: "is_active",
                table: "TimeSlots",
                newName: "IsActive");

            migrationBuilder.RenameColumn(
                name: "end_time",
                table: "TimeSlots",
                newName: "EndTime");

            migrationBuilder.RenameIndex(
                name: "IX_time_slots_restaurant_table_id",
                table: "TimeSlots",
                newName: "IX_TimeSlots_RestaurantTableId");

            migrationBuilder.AddColumn<int>(
                name: "TotalCapacity",
                table: "Sectors",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "RestaurantTableId",
                table: "Reservations",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "SectorId",
                table: "Reservations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AlterColumn<Guid>(
                name: "RestaurantTableId",
                table: "TimeSlots",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "SectorId",
                table: "TimeSlots",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_Sectors",
                table: "Sectors",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Reservations",
                table: "Reservations",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TimeSlots",
                table: "TimeSlots",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_SectorId",
                table: "TimeSlots",
                column: "SectorId");

            migrationBuilder.AddForeignKey(
                name: "FK_restaurant_tables_Sectors_sector_id",
                table: "restaurant_tables",
                column: "sector_id",
                principalTable: "Sectors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Sectors_restaurants_RestaurantId",
                table: "Sectors",
                column: "RestaurantId",
                principalTable: "restaurants",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TimeSlots_Sectors_SectorId",
                table: "TimeSlots",
                column: "SectorId",
                principalTable: "Sectors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TimeSlots_restaurant_tables_RestaurantTableId",
                table: "TimeSlots",
                column: "RestaurantTableId",
                principalTable: "restaurant_tables",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_restaurant_tables_Sectors_sector_id",
                table: "restaurant_tables");

            migrationBuilder.DropForeignKey(
                name: "FK_Sectors_restaurants_RestaurantId",
                table: "Sectors");

            migrationBuilder.DropForeignKey(
                name: "FK_TimeSlots_Sectors_SectorId",
                table: "TimeSlots");

            migrationBuilder.DropForeignKey(
                name: "FK_TimeSlots_restaurant_tables_RestaurantTableId",
                table: "TimeSlots");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Sectors",
                table: "Sectors");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Reservations",
                table: "Reservations");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TimeSlots",
                table: "TimeSlots");

            migrationBuilder.DropIndex(
                name: "IX_TimeSlots_SectorId",
                table: "TimeSlots");

            migrationBuilder.DropColumn(
                name: "TotalCapacity",
                table: "Sectors");

            migrationBuilder.DropColumn(
                name: "SectorId",
                table: "Reservations");

            migrationBuilder.DropColumn(
                name: "SectorId",
                table: "TimeSlots");

            migrationBuilder.RenameTable(
                name: "Sectors",
                newName: "sectors");

            migrationBuilder.RenameTable(
                name: "Reservations",
                newName: "reservations");

            migrationBuilder.RenameTable(
                name: "TimeSlots",
                newName: "time_slots");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "sectors",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "sectors",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "RestaurantId",
                table: "sectors",
                newName: "restaurant_id");

            migrationBuilder.RenameColumn(
                name: "HasMapLayout",
                table: "sectors",
                newName: "has_map_layout");

            migrationBuilder.RenameColumn(
                name: "AllowAnyTable",
                table: "sectors",
                newName: "allow_any_table");

            migrationBuilder.RenameIndex(
                name: "IX_Sectors_RestaurantId",
                table: "sectors",
                newName: "IX_sectors_restaurant_id");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "reservations",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "RestaurantTableId",
                table: "reservations",
                newName: "restaurant_table_id");

            migrationBuilder.RenameColumn(
                name: "ReservationDate",
                table: "reservations",
                newName: "reservation_date");

            migrationBuilder.RenameColumn(
                name: "GuestCount",
                table: "reservations",
                newName: "guest_count");

            migrationBuilder.RenameColumn(
                name: "CustomerPhone",
                table: "reservations",
                newName: "customer_phone");

            migrationBuilder.RenameColumn(
                name: "CustomerName",
                table: "reservations",
                newName: "customer_name");

            migrationBuilder.RenameColumn(
                name: "CustomerEmail",
                table: "reservations",
                newName: "customer_email");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "reservations",
                newName: "created_at");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "time_slots",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "StartTime",
                table: "time_slots",
                newName: "start_time");

            migrationBuilder.RenameColumn(
                name: "RestaurantTableId",
                table: "time_slots",
                newName: "restaurant_table_id");

            migrationBuilder.RenameColumn(
                name: "IsActive",
                table: "time_slots",
                newName: "is_active");

            migrationBuilder.RenameColumn(
                name: "EndTime",
                table: "time_slots",
                newName: "end_time");

            migrationBuilder.RenameIndex(
                name: "IX_TimeSlots_RestaurantTableId",
                table: "time_slots",
                newName: "IX_time_slots_restaurant_table_id");

            migrationBuilder.AlterColumn<Guid>(
                name: "restaurant_table_id",
                table: "reservations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "restaurant_table_id",
                table: "time_slots",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_sectors",
                table: "sectors",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_reservations",
                table: "reservations",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_time_slots",
                table: "time_slots",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "IX_reservations_restaurant_table_id",
                table: "reservations",
                column: "restaurant_table_id");

            migrationBuilder.AddForeignKey(
                name: "FK_reservations_restaurant_tables_restaurant_table_id",
                table: "reservations",
                column: "restaurant_table_id",
                principalTable: "restaurant_tables",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_restaurant_tables_sectors_sector_id",
                table: "restaurant_tables",
                column: "sector_id",
                principalTable: "sectors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_sectors_restaurants_restaurant_id",
                table: "sectors",
                column: "restaurant_id",
                principalTable: "restaurants",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_time_slots_restaurant_tables_restaurant_table_id",
                table: "time_slots",
                column: "restaurant_table_id",
                principalTable: "restaurant_tables",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
