Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;
Vue.component('money', VMoney.Money);
 

let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeId: '',
        id: '',
        tenantId: '',
        socialSecurityNo: '',
        socialSecurityFundEmployerContribution: '0.00',
        socialSecurityFundEmployeeContribution: '0.00',
        providentFundEmployeeContribution: '0.00',
        providentFundEmployerContribution: '0.00',
        secondProvidentFundEmployeeContribution: '0.00',
        secondProvidentFundEmployerContribution: '0.00',
        superAnnuationEmployeeContribution: '0.00',
        superAnnuationEmployerContribution: '0.00',
        employeeInfo: {},
        businessProfile: {},
        paySocialSecurityFund: false,
        payProvidentFund: false,
        paySecondProvidentFund: false,
        paySuperAnnuation: false,
        moneyConfig: {
            decimal: '.',
            thousands: ',',
            prefix: ' ',
            suffix: '',
            precision: 2,
            masked: false
        },

    },
    validations() {

        return {

            socialSecurityNo: {
                required
            },
             
        }
         
    },
    methods: {
        formatToTwoDecimalPlaces(field) {
            if (this[field] !== null && this[field] !== undefined && this[field] !== '') {
                this[field] = parseFloat(this[field]).toFixed(2);
            } else {
                this[field] = '0.00';
            }
        },
        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName === '' || null ? `${v.lastName} ${v.firstName} - ${v.employeeIdentifier}` : `${v.lastName} ${v.firstName} ${v.otherName} - ${v.employeeIdentifier}`

                });

                this.employeeList = response.data.sort((a, b) => a.lastName.localeCompare(b.lastName));;

                $("#employeeId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Employee",
                    width: "100%",
                    fields: { id: "id", text: "employeeName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {
                        this.employeeId = args.value;
                        this.setCurrentEmployee();
                        this.getSsnitInfo();
                    }

                });


            }).catch(err => {

                //console.log(err);
            });
        },

        getBusinessProfile() {

            axios.get('/SharedResource/GetBusinessProfile').then(response => {

                if (response.data) {

                    let businessProfile = response.data;

                    this.businessProfile = response.data;

                    //this.paySocialSecurityFund = businessProfile.paySocialSecurityFund;

                    if (businessProfile.paySocialSecurityFund)
                    {
                        this.paySocialSecurityFund = true;

                        this.socialSecurityFundEmployerContribution = parseFloat(businessProfile.socialSecurityFundEmployerRate).toFixed(2);

                        this.socialSecurityFundEmployeeContribution = parseFloat(businessProfile.socialSecurityFundEmployeeRate).toFixed(2);

                    }

                    //this.payProvidentFund = businessProfile.payProvidentFund;

                    if (businessProfile.payProvidentFund) {

                        this.payProvidentFund = true;

                        this.providentFundEmployerContribution = parseFloat(businessProfile.providentFundEmployeeContribution).toFixed(2);

                        this.providentFundEmployeeContribution = parseFloat(businessProfile.providentFundEmployeeContribution).toFixed(2);


                    }

                }

            }).catch(err => {

                console.log(err);

            });
        },
        
        getSsnitInfo() {

            axios.get('/PayrollDataEntry/GetEmployeeSsnitInfo?employeeId='+this.employeeId).then(response => {

                if (response.data) {

                    let employeeSsnitInfo = response.data;

                    this.socialSecurityNo = employeeSsnitInfo.socialSecurityNo;
                    this.socialSecurityFundEmployerContribution = parseFloat(employeeSsnitInfo.socialSecurityFundEmployerContribution).toFixed(2);
                    this.socialSecurityFundEmployeeContribution = parseFloat(employeeSsnitInfo.socialSecurityFundEmployeeContribution).toFixed(2);
                    this.providentFundEmployeeContribution = parseFloat(employeeSsnitInfo.providentFundEmployeeContribution).toFixed(2);
                    this.providentFundEmployerContribution = parseFloat(employeeSsnitInfo.providentFundEmployerContribution).toFixed(2);
                    this.secondProvidentFundEmployeeContribution = parseFloat(employeeSsnitInfo.secondProvidentFundEmployeeContribution).toFixed(2);
                    this.secondProvidentFundEmployerContribution = parseFloat(employeeSsnitInfo.secondProvidentFundEmployerContribution).toFixed(2);
                    this.superAnnuationEmployeeContribution = parseFloat(employeeSsnitInfo.superAnnuationEmployeeContribution).toFixed(2);
                    this.superAnnuationEmployerContribution = parseFloat(employeeSsnitInfo.superAnnuationEmployerContribution).toFixed(2);
                    this.id = employeeSsnitInfo.id;
                    this.tenantId = employeeSsnitInfo.tenantId;

                    this.paySocialSecurityFund = employeeSsnitInfo.socialSecurityFundEmployeeContribution > 0 || employeeSsnitInfo.socialSecurityFundEmployerContribution > 0;
                    this.paySecondProvidentFund = employeeSsnitInfo.secondProvidentFundEmployeeContribution > 0 || employeeSsnitInfo.secondProvidentFundEmployerContribution > 0;
                    this.payProvidentFund = employeeSsnitInfo.providentFundEmployeeContribution > 0 || employeeSsnitInfo.providentFundEmployerContribution > 0;
                     
                }
                else {
                    
                    this.socialSecurityNo = '';
                    this.socialSecurityFundEmployerContribution = '0.00';
                    this.socialSecurityFundEmployeeContribution = '0.00';
                    this.providentFundEmployeeContribution = '0.00';
                    this.providentFundEmployerContribution = '0.00';
                    this.secondProvidentFundEmployeeContribution = '0.00';
                    this.secondProvidentFundEmployerContribution = '0.00';
                    this.superAnnuationEmployeeContribution = '0.00';
                    this.superAnnuationEmployerContribution = '0.00';
                    this.id = null;
                    this.paySecondProvidentFund = false;
                    this.paySecondProvidentFund = false;
                    this.payProvidentFund = false;
                }
                
            }).catch(err => {

                //console.log(err);
            });

        },

       

        saveSnitInfo() {

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

            this.isLoading = true;

            let payload = {};

            payload.socialSecurityNo = this.socialSecurityNo;
            payload.socialSecurityFundEmployerContribution = parseFloat(this.socialSecurityFundEmployerContribution);
            payload.socialSecurityFundEmployeeContribution = parseFloat(this.socialSecurityFundEmployeeContribution);
            payload.providentFundEmployeeContribution = parseFloat(this.providentFundEmployeeContribution);
            payload.providentFundEmployerContribution = parseFloat(this.providentFundEmployerContribution);
            payload.secondProvidentFundEmployeeContribution = parseFloat(this.secondProvidentFundEmployeeContribution);
            payload.secondProvidentFundEmployerContribution = parseFloat(this.secondProvidentFundEmployerContribution);
            payload.superAnnuationEmployeeContribution = parseFloat(this.superAnnuationEmployeeContribution);
            payload.superAnnuationEmployerContribution = parseFloat(this.superAnnuationEmployerContribution);
            payload.employeeId = this.employeeId;

            payload.employeeIdentifier = this.employeeInfo.employeeIdentifier;
            payload.employeeName = this.employeeInfo.employeeName;
            
            payload.paySocialSecurityFund = this.paySocialSecurityFund;
            payload.payProvidentFund = this.payProvidentFund;
            payload.paySecondProvidentFund = this.paySecondProvidentFund;
            payload.paySuperAnnuation =  this.paySuperAnnuation;
            
            

            if (this.id) {

                payload.id = this.id;
                payload.tenantId = this.tenantId;

                axios.post('/PayrollDataEntry/UpdateEmployeeSsnit', payload).then(response => {

                    this.toastHandler('', 'Employee SSNIT info saved.');
                   

                    this.isLoading = false;


                }).catch(err => {

                    this.toastHandler('error', 'Unable to save employee SSNIT info.');
                    this.isLoading = false;

                });
            }
            else {

                axios.post('/PayrollDataEntry/CreateEmployeeSsnit', payload).then(response => {

                    this.toastHandler('', 'Employee SSNIT info saved.');
                    this.id = '';
                    this.isLoading = false;


                }).catch(err => {

                    this.toastHandler('error', 'Unable to save employee SSNIT info.');
                    this.isLoading = false;

                });

            }
            
        },

        setCurrentEmployee() {

            this.employeeInfo = this.getEmployeeDetails(this.employeeId);
        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

        resetForm(){

            this.socialSecurityNo = '';
            
            
           /* $("#ssfEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            $("#ssfEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            $("#pfEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            $("#pfEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            $("#secPFEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            $("#secPFEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            $("#saEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            $("#saEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });*/


            this.socialSecurityFundEmployerContribution = '0.00';
            this.socialSecurityFundEmployeeContribution = '0.00';
            this.providentFundEmployeeContribution = '0.00';
            this.providentFundEmployerContribution = '0.00';
            this.secondProvidentFundEmployeeContribution = '0.00';
            this.secondProvidentFundEmployerContribution = '0.00';
            this.superAnnuationEmployeeContribution = '0.00';
            this.superAnnuationEmployerContribution = '0.00';
        },

        initControls() {
             
            $(function () {

                $("#ssfEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#ssfEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#pfEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#pfEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#secPFEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#secPFEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#saEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#saEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            });


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

        employeeId(val) {

            if (val) {
                this.setCurrentEmployee();
                this.getSsnitInfo();

            }

        },
        /*paySocialSecurityFund(val) {

            if (val) {
                
                this.socialSecurityFundEmployerContribution = this.businessProfile.socialSecurityFundEmployerRate;
                this.socialSecurityFundEmployeeContribution = this.businessProfile.socialSecurityFundEmployeeRate;

                $("#ssfEmployer").ejNumericTextbox({ value: this.businessProfile.socialSecurityFundEmployerRate, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#ssfEmployee").ejNumericTextbox({ value: this.businessProfile.socialSecurityFundEmployeeRate, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            }
            else{

                this.socialSecurityFundEmployerContribution = 0;
                this.socialSecurityFundEmployeeContribution = 0;

                $("#ssfEmployer").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

                $("#ssfEmployee").ejNumericTextbox({ value: 0, minValue: 0, maxValue: 100, decimalPlaces: 2, watermarkText: "0.00", width: 'inherit', });

            }

        },*/
        paySocialSecurityFund(val) {
            if (val) {
                this.socialSecurityFundEmployerContribution = parseFloat(this.businessProfile.socialSecurityFundEmployerRate).toFixed(2);
                this.socialSecurityFundEmployeeContribution = parseFloat(this.businessProfile.socialSecurityFundEmployeeRate).toFixed(2);
            } else {
                this.socialSecurityFundEmployerContribution = parseFloat(0).toFixed(2);
                this.socialSecurityFundEmployeeContribution = parseFloat(0).toFixed(2);
            }
        },


        payProvidentFund(val) {
            if (val) {
                this.providentFundEmployeeContribution = parseFloat(this.businessProfile.providentFundEmployeeRate).toFixed(2);
                this.providentFundEmployerContribution = parseFloat(this.businessProfile.providentFundEmployerRate).toFixed(2);
            } else {
                this.providentFundEmployeeContribution = parseFloat(0).toFixed(2);
                this.providentFundEmployerContribution = parseFloat(0).toFixed(2);
            }
        },

        paySecondProvidentFund(val) {
            if (val) {
                this.secondProvidentFundEmployeeContribution = parseFloat(this.businessProfile.secondProvidentEmployeeRate).toFixed(2);
                this.secondProvidentFundEmployerContribution = parseFloat(this.businessProfile.secondProvidentEmployerRate).toFixed(2);
            } else {
                this.secondProvidentFundEmployeeContribution = parseFloat(0).toFixed(2);
                this.secondProvidentFundEmployerContribution = parseFloat(0).toFixed(2);
            }
        }
        
        

    },
    created() {

        /*this.initControls();*/
        this.getEmployees();
        this.getBusinessProfile();
        

    },
});