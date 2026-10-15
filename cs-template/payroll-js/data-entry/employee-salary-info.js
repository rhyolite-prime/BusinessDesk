Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;


let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        bankList: [],
        bankBranchList: [],
        currencyList: [],
        employeeId: '',
        id: '',
        tenantId: null,
        bankId: '',
        bankBranchId: '',
        salaryType: 'Salaried',
        accountNumber: '',
        previousSalary: 0,
        vacationDaysPaid: 0,
        currentHourlyRate: 0,
        paysGraduatedTax: true,
        withHoldingTaxRate: 0.0,
        paysWithHoldingTax: false,
        payType: 'Cheque',
        dailyHours: 8,
        monthlySalary: '',
        currencyId: '',
        salaryInfoId: ''

    },
    validations() {

        return {

            employeeId: {
                required
            },
            monthlySalary: {
                required
            },
            accountNumber: {
                required,
            },
            currencyId: {
                required,
            },
            

        }


    },
    methods: {

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName === '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.employeeList = response.data.sort((a, b) => a.lastName.localeCompare(b.lastName));

                $("#employeeId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Employee",
                    width: "100%",
                    fields: { id: "id", text: "employeeName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        
                        this.employeeId = args.value;
                    }

                });


            }).catch(err => {

                //console.log(err);
            });
        },

        getBanks() {

            axios.get('/SharedResource/GetBanks').then(response => {

                this.bankList = response.data;

            }).catch(err => {

                //console.log(err);
            });
        },

         

        
        getCurrency() {

            axios.get('/SharedResource/GetCurrencys').then(response => {

                this.currencyList = response.data;
                
                if (response.data){

                    let defaultCurrency = response.data.find(a => a.isDefault); 
                   
                    if(defaultCurrency){

                        this.currencyId =  defaultCurrency.id;
                    }
                    
                }
                

            }).catch(err => {

                //console.log(err);

            });
        },

        getEmployeeSalaryInfo() {

            axios.get(`/PayrollDataEntry/GetEmployeeSalaryInfo?employeeId=${this.employeeId}`).then(response => {

                if (response.data) {

                    let employeeSalaryInfo = response.data;

                    this.salaryInfoId = employeeSalaryInfo.id;
                    this.tenantId = employeeSalaryInfo.tenantId;
                    this.salaryType = employeeSalaryInfo.salaryType;
                    this.bankId = employeeSalaryInfo.bankId;
                    this.accountNumber = employeeSalaryInfo.accountNumber;
                    this.previousSalary = employeeSalaryInfo.previousSalary;
                    this.vacationDaysPaid = employeeSalaryInfo.vacationDaysPaid;
                    this.payType = employeeSalaryInfo.payType;
                    this.bankBranchId = employeeSalaryInfo.bankBranchId;
                    this.dailyHours = employeeSalaryInfo.dailyHours;
                    this.monthlySalary = employeeSalaryInfo.monthlySalary;
                    this.currencyId = employeeSalaryInfo.currencyId;
                    this.currentHourlyRate = employeeSalaryInfo.currentHourlyRate;
                    this.paysGraduatedTax = employeeSalaryInfo.paysGraduatedTax;
                    this.withHoldingTaxRate = employeeSalaryInfo.withHoldingTaxRate;
                    this.paysWithHoldingTax = employeeSalaryInfo.paysWithHoldingTax;
                }
                else
                {
                   
                    this.resetForm();
                }

            }).catch(err => {

                //console.log(err);
            });

        },

        resetForm() {

            this.salaryType = 'Salaried';
            this.bankId = '';
            this.accountNumber = '';
            this.previousSalary = '';
            this.vacationDaysPaid = '';
            this.payType = 'Cheque';
            this.bankBranchId = '';
            this.dailyHours = 8;
            this.monthlySalary = '';
            this.currencyId = '';
            this.currentHourlyRate = '';
            this.paysGraduatedTax = true;
            this.paysWithHoldingTax = false;
            this.withHoldingTaxRate = 0;

        },

        saveSalaryInfo() {

            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }  

            let payload = {};

            this.isLoading = true;

            let employeeDetails = this.getEmployeeDetails(this.employeeId);

            payload.employeeIdentifier = employeeDetails.employeeIdentifier;
            payload.employeeId = this.employeeId;
            payload.employeeName = employeeDetails.employeeName;
            payload.salaryType = this.salaryType;
            payload.payType = this.payType;
            payload.dailyHours = !this.dailyHours ? 0 : this.dailyHours; 
            payload.previousSalary = !this.previousSalary ? 0 : this.previousSalary; 
            payload.monthlySalary = this.monthlySalary;
            payload.currentHourlyRate = !this.currentHourlyRate ? 0 : this.currentHourlyRate;
            payload.accountNumber = this.accountNumber;
            payload.vacationDaysPaid = !this.vacationDaysPaid ? 0 : this.vacationDaysPaid;
            payload.bankId = this.bankId;
            payload.currencyId = this.currencyId;
            payload.bankBranchId = this.bankBranchId;
            payload.employeeCategoryId = employeeDetails.categoryId;
            payload.employeeSalaryGradeId = employeeDetails.salaryGradeId;
            payload.employeeSalaryNotchId = employeeDetails.salaryNotchId;
            payload.currencyId = this.currencyId;
            payload.paysGraduatedTax = this.paysGraduatedTax;
            payload.paysWithHoldingTax = this.paysWithHoldingTax;
            payload.withHoldingTaxRate = this.withHoldingTaxRate;
            
            let currencyInfo = this.getCurrencyDetails(this.currencyId);

            if (currencyInfo) {

                payload.currencyName = currencyInfo.currencyName;

            }
            else {

                payload.currencyId = this.emptyGuid;
            }


            if (this.bankId) {

                let bankInfo = this.getBankDetails(this.bankId);
                if (bankInfo) {

                    payload.bankId = this.bankId;
                    payload.bankName = bankInfo.name;
                }
                
            }
            else {

                payload.bankId = this.emptyGuid;
            }

            if (this.bankBranchId) {

                let bankBranchInfo = this.getBankBranchDetails(this.bankBranchId);
                if (bankBranchInfo) {
                    payload.bankBranchId = this.bankBranchId;
                    payload.departmentName = bankBranchInfo.name;
                }
                

            }
            else {
                payload.bankBranchId = this.emptyGuid;
            }


            if (this.salaryInfoId) {

                payload.id = this.salaryInfoId;
                payload.tenantId = this.tenantId;

                axios.post('/PayrollDataEntry/UpdateEmployeeSalaryInfo', payload).then(response => {

                    this.toastHandler('', 'Employee salary info updated.');
                    this.isLoading = false;
                    this.salaryInfoId = '';

                }).catch(err => {

                    this.toastHandler('error', 'Unable to save employee salary info.');
                    this.isLoading = false;

                });
            }
            else {

                axios.post('/PayrollDataEntry/CreateEmployeeSalaryInfo', payload).then(response => {

                    this.toastHandler('', 'Employee salary info saved.');
                    this.isLoading = false;
                    this.salaryInfoId = '';

                }).catch(err => {

                    this.toastHandler('error', 'Unable to save employee salary info.');
                    this.isLoading = false;

                });
            }
            
        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        getBankDetails(id) {

            return this.bankList.find(a => a.id === id);
        },

        getCurrencyDetails(id) {

            return this.currencyList.find(a => a.id === id);
        },

        getBankBranchDetails(id) {

            return this.bankBranchList.find(a => a.id === id);
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

        bankId(val) {

            if (val) {

                let bankInfo = this.getBankDetails(val);
                
                if (bankInfo) {

                    this.bankBranchList = bankInfo.bankBranches;
                }

            }

        },

        employeeId(val) {

            if (val) {
                this.getEmployeeSalaryInfo();
            }

        },

        salaryType(val){

            if (val) {

                this.dailyHours = 0;
            }
            
        },

        paysWithHoldingTax(val){

            if (!val) {

                this.withHoldingTaxRate = 0.0;
                
            }else {
                this.paysGraduatedTax = false;
            }
            
        },

        paysGraduatedTax(val){

            if (val) {

                this.withHoldingTaxRate = 0.0;
                this.paysWithHoldingTax = false;
            }
            
        }

    },
    created() {

        this.getBanks();
        this.getEmployees();
        this.getCurrency();

    },
});