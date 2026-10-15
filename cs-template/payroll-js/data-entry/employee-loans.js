Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;
Vue.component('date-picker', VueBootstrapDatetimePicker);


let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        employeeId: '',
        id: '',
        tenantId: '',
        loanTypeList: [],
        loanDate: moment().format("YYYY-MM-DD"),
        loanTypeId: '',
        amount: null,
        monthlyDeduction: null,
        annualInterestRate: null,
        interestCharges: null,
        deductionStarts: moment().format("YYYY-MM-DD"),
        nextDeduction: 1,
        duration: 1,
        currentBalance: null,
        interestType: 'No Interest',
        chargeInterest: false,
        month: '',
        year: '',
        /*loanDateConfig: {
            format: 'DD-MM-YYYY',
            viewMode: 'days',
            defaultDate: new Date()
        },
        deductionDateConfig: {
            format: 'DD-MM-YYYY',
            viewMode: 'days',
            defaultDate: new Date(),
            minDate: new Date()
        },*/
        
    },
    validations() {

        return {

            loanTypeId: {
                required
            },

            loanDate: {
                required
            },

            deductionStarts: {
                required
            },

            amount: {
                required
            },


            duration: {
                required
            },
            
        }


    },

    methods: {

        getCurrentPayMonth() {

            axios.get('/PayrollSetups/GetPayMonth').then(response => {

                if (response.data) {

                    this.month = response.data.month;
                    this.year = response.data.year;
                }

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get pay month data.');

            });
        },

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
 
        getLoanTypes() {

            axios.get('/PayrollSetups/GetLoanTypes').then(response => {
 
                this.loanTypeList = response.data
                
            }).catch(err => {

                //console.log(err);
            });

        },

        saveEmployeeLoan() {
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

            if (!this.employeeId) {

                this.toastHandler('warning', 'Select or Search an employee');
                return;
            }
            
            if (this.loanDate > this.deductionStarts) {
                this.toastHandler('warning', 'Deduction date must be greater than loan date');
                return;
            }
            
            const deductionDate = new Date(this.deductionStarts);
            const deductionMonth = deductionDate.getMonth() + 1;
            const deductionYear = deductionDate.getFullYear();

            const currentPayMonth = parseInt(this.month);
            const currentPayYear = parseInt(this.year);
            
            if (deductionMonth < currentPayMonth || (deductionMonth === currentPayMonth && deductionYear < currentPayYear)) {
                this.toastHandler('warning', 'Deduction start date must be greater than or equal to current pay month.');
                return;
            }
            
            
            this.isLoading = true;

            payload.employeeId = this.employeeId;

            let employeeInfo = this.getEmployeeDetails(this.employeeId);

            payload.employeeIdentifier = employeeInfo.employeeIdentifier;

            payload.employeeName = employeeInfo.employeeName;

            payload.loanDate = this.loanDate;

            payload.deductionStarts = this.deductionStarts;

            payload.loanTypeId = this.loanTypeId;

            let loanInfo = this.getLoanTypeDetails(this.loanTypeId);

            payload.loanTypeName = loanInfo.name;
            payload.nextDeduction = this.nextDeduction;
            payload.amount = parseFloat(this.amount);
            payload.duration = this.duration;
            payload.monthlyDeduction = parseFloat(this.monthlyDeduction);
            payload.chargeInterest = loanInfo.chargeInterest;
            payload.currentBalance = this.currentBalance ? parseFloat(this.currentBalance) : 0;
            payload.annualInterestRate = this.annualInterestRate ? parseFloat(this.annualInterestRate) : 0;
            payload.interestType = this.interestType;
            payload.interestCharges = this.interestCharges ? parseFloat(this.interestCharges) : 0;
            
            axios.post('/PayrollDataEntry/CreateEmployeeLoan', payload).then(response => {

                this.toastHandler('', 'Employee Loan saved.');
                this.isLoading = false;
                this.resetForm();

            }).catch(err => {

                this.toastHandler('error', 'Unable to save employee loan.');
                this.isLoading = false;

            });
            
            
        },
        
        getLoanTypeDetails(id) {

            return this.loanTypeList.find(a => a.id === id);
        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

      

        calculateInterest() {

            let simpleInterest = 0;
            
            let timeInYears = this.duration / 12;

            if (this.amount && timeInYears !== 0) {

                if (this.interestType === "Simple Interest") {

                    simpleInterest = (this.amount * this.annualInterestRate * timeInYears) / 100;

                    this.interestCharges = parseFloat(simpleInterest).toFixed(2);
                    this.currentBalance = parseFloat(parseFloat(simpleInterest) + parseFloat(this.amount)).toFixed(2);
                    
                    let amountToPay = parseFloat(this.interestCharges) + parseFloat(this.amount);
                    
                    this.monthlyDeduction = parseFloat(amountToPay / this.duration).toFixed(2);

                }
                else if (this.interestType === "Compound Interest") {

                    let compoundAmount = this.amount * (1 + (this.annualInterestRate / 1)) ** (timeInYears * 1);

                    let compoundInterest = compoundAmount - this.amount;

                    this.interestCharges = parseFloat(compoundInterest).toFixed(2);
                    this.currentBalance = parseFloat(compoundAmount).toFixed(2);
                    this.monthlyDeduction = parseFloat(parseFloat(compoundAmount) / this.duration).toFixed();


                }
                else
                {

                    this.interestCharges = 0;
                    this.currentBalance = parseFloat(this.amount).toFixed(2);
                    this.monthlyDeduction = parseFloat(parseFloat(this.amount) / this.duration).toFixed(2);

                }

            }

        },

        resetForm() {
          
            this.$v.$reset();
            this.employeeId = '';

            let employeeDropdown = $("#employeeId").data("ejDropDownList");
            employeeDropdown.clearText();
            employeeDropdown.option("value", "");
            
            this.loanDate = moment().format("YYYY-MM-DD");
            this.loanTypeId = '';
            this.amount = null;
            this.monthlyDeduction = null;
            this.annualInterestRate = null;
            this.interestCharges = null;
            this.deductionStarts = moment().format("YYYY-MM-DD");
            this.nextDeduction = 1;
            this.duration = 1;
            this.currentBalance = null;
            this.interestType = 'No Interest';
            this.chargeInterest = false;
            this.id = '';
            this.tenantId = '';
            
        },
         
        convertDate(dateStr) {
                // Split the date string into parts
                const [day, month, year] = dateStr.split('-');
            
                // Create a new Date object using the parts
                const date = new Date(`${year}-${month}-${day}`);
            
                // Convert the date to the desired format
                return date;
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

        loanTypeId(val) {

            if (val) {

                let loanInfo = this.getLoanTypeDetails(val);

                this.chargeInterest = loanInfo.chargeInterest;
                this.interestType = loanInfo.chargeInterest ? 'Simple Interest': 'No Interest';
                this.annualInterestRate = loanInfo.chargeInterest ? 1 : 0;

            }
        },
        duration(val) {

            if (val <= 0) {
                this.duration = 1;
            }

            this.calculateInterest();
        },
        amount(val) {

            if (val <= 0) {
                this.amount = 1;
            }
            this.calculateInterest();
        },
        annualInterestRate(val) {

            if (val < 0) {
                this.annualInterestRate = 1;
            }
            this.calculateInterest();
        },

        nextDeduction(val) {

            if (val <= 0) {
                this.nextDeduction = 1;
            }
        },
        interestType(val) {
            this.calculateInterest();

        },
        /*loanDate(val){
            
            this.deductionDateConfig.minDate = this.convertDate(val);
        }*/
    },
    created() {

        this.getCurrentPayMonth();
        this.getEmployees();
        this.getLoanTypes();

    },
});