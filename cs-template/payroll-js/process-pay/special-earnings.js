
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        month: 1,
        year: new Date().getFullYear(),
        employeeStatusList: [],
        processingText: 'Process Pay',
        earningTypeList: [],
        earningTypeId: '',
    },
    
    methods: {

        getEmployeeStatus() {

            axios.get('/PayrollSetups/GetEmployeeStatus').then(response => {

                this.employeeStatusList = response.data;

            }).catch(err => {


            });
        },

        getSpecialEarningTypes() {

            axios.get('/PayrollSetups/GetSpecialEarnings').then(response => {

                this.earningTypeList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve special earnings.');

            });

        },
 
        processPay() {

            let earningTypeInfo = this.earningTypeList.find(a=> a.id === this.earningTypeId);
            
            if (earningTypeInfo && earningTypeInfo.name.toLowerCase().includes("13th month")){
                
                this.process13thMonthBonus();
            }
        },
        
        process13thMonthBonus(){

            this.isLoading = true;
            this.processingText = 'Processing...';

            let defaultStatusInfo = this.getDefaultStatus();

            let statusId = defaultStatusInfo ? defaultStatusInfo.id : this.emptyGuid;

            axios.get(`/ProcessPay/InitSpecialEarningPay?defaultStatusId=${statusId}&earningTypeId=${this.earningTypeId}`).then(response => {

                if (response.data.code === 200) {

                    this.toastHandler('', 'Payroll processed successfully.');

                    this.isLoading = false;
                    this.processingText = 'Process Pay';

                    this.getPayrollResults();

                }
                else {

                    this.toastHandler('error', response.data.message);

                    this.isLoading = false;
                    this.processingText = 'Process Pay';
                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to process special earnings.');
                this.isLoading = false;
                this.processingText = 'Process Pay';

            });
            
        },

        getPayrollResults() {

            axios.get('/ProcessPay/GetSpecialEarningsPayrollResults').then(response => {

                this.renderTable(response.data);

            }).catch(err => {


            });
        },
        
        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeName", headerText: 'Employee Name', textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "employeeIdentifier", headerText: 'Employee ID', textAlign: ej.TextAlign.Left, width: 45 },
                    { field: "earningTypeName", headerText: 'Earning Type', textAlign: ej.TextAlign.Left, width: 75 },
                    { field: "employeeCategory", headerText: "Employee Category", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 75 },
                    { field: "amount", headerText: "Amount", textAlign: ej.TextAlign.Right, defaultValue: 0, editType: ej.Grid.EditingType.Numeric, editParams: { decimalPlaces: 2 }, format: "{0:n2}", width: 55 },
                    { field: "tenantId", visible: false, headerText: "tenantId", width: 15, },

                ],
                 
            });

        },

        getCurrentPayMonth() {

            axios.get('/PayrollSetups/GetPayMonth').then(response => {

                if (response.data) {

                    this.month = response.data.month;
                    this.year = response.data.year;
                }

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to pay month data.');

            });
        },

        getDefaultStatus() {

            return this.employeeStatusList.find(x => x.isDefault);
        },

        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {

                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }

        },

        
    },
    watch: {


    },
    created() {

        this.getSpecialEarningTypes();
        
        this.getCurrentPayMonth();
        
        this.getEmployeeStatus();
        
        this.getPayrollResults();
    },
});