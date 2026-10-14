using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TopazERP.Migrations
{
    public partial class initial13 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "WithHeld",
                table: "GlPaymentVouchers",
                newName: "WithHoldingVatPercentage");

            migrationBuilder.RenameColumn(
                name: "VatWithHoldGlId",
                table: "GlPaymentVouchers",
                newName: "WithHoldingAccountId");

            migrationBuilder.RenameColumn(
                name: "VatWithHoldGlAccountName",
                table: "GlPaymentVouchers",
                newName: "WithHoldingAccountName");

            migrationBuilder.RenameColumn(
                name: "VatWithHold",
                table: "GlPaymentVouchers",
                newName: "IsPayment");

            migrationBuilder.RenameColumn(
                name: "VatAmount",
                table: "GlPaymentVouchers",
                newName: "WithHoldingRate");

            migrationBuilder.RenameColumn(
                name: "Total",
                table: "GlPaymentVouchers",
                newName: "TotalWithheld");

            migrationBuilder.RenameColumn(
                name: "Retained",
                table: "GlPaymentVouchers",
                newName: "TotalVatWithheld");

            migrationBuilder.RenameColumn(
                name: "NhilRate",
                table: "GlPaymentVouchers",
                newName: "TotalVatAmount");

            migrationBuilder.RenameColumn(
                name: "HasNhil",
                table: "GlPaymentVouchers",
                newName: "HasWithHolding");

            migrationBuilder.RenameColumn(
                name: "HasGetFl",
                table: "GlPaymentVouchers",
                newName: "HasVatWithhold");

            migrationBuilder.RenameColumn(
                name: "GetFlRate",
                table: "GlPaymentVouchers",
                newName: "TotalRetained");

            migrationBuilder.RenameColumn(
                name: "BankGlId",
                table: "GlPaymentVouchers",
                newName: "VatWithHoldingAccountId");

            migrationBuilder.RenameColumn(
                name: "BankGlAccountName",
                table: "GlPaymentVouchers",
                newName: "VatWithHoldingAccountName");

            migrationBuilder.AddColumn<Guid>(
                name: "BankAccountId",
                table: "GlPaymentVouchers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "BankAccountName",
                table: "GlPaymentVouchers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseAmount",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "BuyRate",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CommunicationServiceTaxRate",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CovidTaxRate",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "GlPaymentVouchers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CurrencyId",
                table: "GlPaymentVouchers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "CurrencyName",
                table: "GlPaymentVouchers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GetFundLevyRate",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GrossAmount",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "HasCommunicationServiceTax",
                table: "GlPaymentVouchers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasCovidTax",
                table: "GlPaymentVouchers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasGetFundLevy",
                table: "GlPaymentVouchers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasNationalHealthInsuranceLevy",
                table: "GlPaymentVouchers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "NationalHealthInsuranceLevyRate",
                table: "GlPaymentVouchers",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountId",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "BankAccountName",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "BaseAmount",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "BuyRate",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "CommunicationServiceTaxRate",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "CovidTaxRate",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "CurrencyId",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "CurrencyName",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "GetFundLevyRate",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "GrossAmount",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "HasCommunicationServiceTax",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "HasCovidTax",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "HasGetFundLevy",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "HasNationalHealthInsuranceLevy",
                table: "GlPaymentVouchers");

            migrationBuilder.DropColumn(
                name: "NationalHealthInsuranceLevyRate",
                table: "GlPaymentVouchers");

            migrationBuilder.RenameColumn(
                name: "WithHoldingVatPercentage",
                table: "GlPaymentVouchers",
                newName: "WithHeld");

            migrationBuilder.RenameColumn(
                name: "WithHoldingRate",
                table: "GlPaymentVouchers",
                newName: "VatAmount");

            migrationBuilder.RenameColumn(
                name: "WithHoldingAccountName",
                table: "GlPaymentVouchers",
                newName: "VatWithHoldGlAccountName");

            migrationBuilder.RenameColumn(
                name: "WithHoldingAccountId",
                table: "GlPaymentVouchers",
                newName: "VatWithHoldGlId");

            migrationBuilder.RenameColumn(
                name: "VatWithHoldingAccountName",
                table: "GlPaymentVouchers",
                newName: "BankGlAccountName");

            migrationBuilder.RenameColumn(
                name: "VatWithHoldingAccountId",
                table: "GlPaymentVouchers",
                newName: "BankGlId");

            migrationBuilder.RenameColumn(
                name: "TotalWithheld",
                table: "GlPaymentVouchers",
                newName: "Total");

            migrationBuilder.RenameColumn(
                name: "TotalVatWithheld",
                table: "GlPaymentVouchers",
                newName: "Retained");

            migrationBuilder.RenameColumn(
                name: "TotalVatAmount",
                table: "GlPaymentVouchers",
                newName: "NhilRate");

            migrationBuilder.RenameColumn(
                name: "TotalRetained",
                table: "GlPaymentVouchers",
                newName: "GetFlRate");

            migrationBuilder.RenameColumn(
                name: "IsPayment",
                table: "GlPaymentVouchers",
                newName: "VatWithHold");

            migrationBuilder.RenameColumn(
                name: "HasWithHolding",
                table: "GlPaymentVouchers",
                newName: "HasNhil");

            migrationBuilder.RenameColumn(
                name: "HasVatWithhold",
                table: "GlPaymentVouchers",
                newName: "HasGetFl");
        }
    }
}
