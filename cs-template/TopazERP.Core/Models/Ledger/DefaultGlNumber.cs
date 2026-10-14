using System;

namespace TopazERP.Models.Ledger;

public class DefaultGlNumber: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid AccountPayablesBankAccountId { get; set; }
        public Guid PayRollBankAccountId { get; set; }
        public Guid SalesBankAccountId { get; set; }
        public Guid AccountsReceivableBankAccountId { get; set; }
        public Guid AccountsReceivableAccountId { get; set; }
        public Guid AccountsPayableAccountId { get; set; }
        public Guid WithholdingTaxAccountId { get; set; }
        public Guid ImprestCategoryId { get; set; }
        public Guid CreditPurchasesAccountId { get; set; }
        public Guid AdvanceFromCustomerAccountId { get; set; }
        public Guid CovidTaxReceivedAccountId { get; set; }
        public Guid CommunicationsServiceTaxReceivedAccountId { get; set; }
        public Guid InventoryAccountId { get; set; }
        public Guid SalesRevenueAccountId { get; set; }
        public Guid StockPurchasesAccountId { get; set; }
        public Guid CurrentEarningsAccountId { get; set; }
        public Guid RetainedEarningsAccountId { get; set; }
        public Guid VatReceivedAccountId { get; set; }
        public decimal VatRate { get; set; }
        public Guid ImprestGlAccountId { get; set; }
        public Guid PettyCashGlAccountId { get; set; }
        public Guid PurchasesBankAccountId { get; set; }
        public Guid AdvanceToSupplierAccountId { get; set; }
        public Guid CovidTaxPaidAccountId { get; set; }
        public Guid CommunicationsServiceTaxPaidAccountId { get; set; }
        public Guid GoodsInTransitAccountId { get; set; }
        public Guid UnrealizedFxLossAccountId { get; set; }
        public Guid UnrealizedFxGainAccountId { get; set; }
        public Guid RealizedFxLossAccountId { get; set; }
        public Guid RealizedFxGainAccountId { get; set; }
        public Guid VatPaidAccountId { get; set; }
        public Guid GetflReceivedAccountId { get; set; }
        public Guid GetflPaidAccountId { get; set; }
        public Guid NhilReceivedAccountId { get; set; }
        public Guid NhilPaidAccountId { get; set; }

        //social security...
        public Guid SocialSecurityEmployerPortionDefaultExpenseGl { get; set; }
        public Guid SocialSecurityEmployeePortionDefaultExpenseGl { get; set; }
        public Guid SocialSecurityEmployerPortionDefaultLiabilityGl { get; set; }
        public Guid SocialSecurityEmployeePortionDefaultLiabilityGl { get; set; }
        public int TenantId { get; set; }
}