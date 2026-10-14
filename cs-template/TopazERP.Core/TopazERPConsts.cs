using TopazERP.Debugging;

namespace TopazERP
{
    public class TopazERPConsts
    {
        public const string LocalizationSourceName = "TopazERP";

        public const string ConnectionStringName = "Default";

        public const bool MultiTenancyEnabled = true;


        /// <summary>
        /// Default pass phrase for SimpleStringCipher decrypt/encrypt operations
        /// </summary>
        public static readonly string DefaultPassPhrase =
            DebugHelper.IsDebug ? "gsKxGZ012HLL3MI5" : "9eb20c2f05644af18947623902da8fc2";


        //Module Constants
        public const int GeneralLedger = 100;
        public const int Payroll = 200;
        public const int SchoolManager = 300;
        public const int StockManager = 400;
        public const int HRManager = 500;
        public const int AccountPayables = 600;
        public const int AccountReceivables = 700;
        public const int AssetManager = 800;
         
        
        public const string VatTaxLevyType = "vat";
        public const string OtherTaxLevyType = "others";

        // StandardAccountType enum
        
        public enum StandardAccountType
        {
            // Balance Sheet accounts
            Asset = 1,
            Liability = 2,
            Equity = 3,
            // Income Statement accounts (General)
            Revenue = 4,
            Expense = 5,
            // Other Income/Expense (General)
            OtherIncome = 6,
            OtherExpense = 7,
            // Selling Company specific
            Sales = 8,
            CostOfSales = 9,
            SellingExpenses = 10
        }
        
        public enum StandardAccountType_SellingCompany
        {
            Asset = 1,
            Liability = 2,
            Equity = 3,
            Sales = 4,
            CostOfSales = 5,
            Expenses = 6,
        }
         

         
    }
}
