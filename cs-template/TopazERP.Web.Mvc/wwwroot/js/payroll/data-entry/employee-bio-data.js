Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;
Vue.component('date-picker', VueBootstrapDatetimePicker);

let vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        nationalityList: [],
        salaryGradeList: [],
        salaryNotchList: [],
        employeeList: [],
        rankList: [],
        categoryList: [],
        religionList: [],
        departmentList: [],
        departmentNameList: [],
        departmentHierachyList: [],
        statusList: [],
        employeeIdentifier: '',
        lastName: '',
        employeeId: '',
        gender: 'Male',
        departmentId: '',
        categoryId: '',
        salaryGradeId: '',
        dateAppointed: '',
        personalEmail: '',
        primaryPhoneNumber: '',
        nationalityId: '',
        dateOfBirth: '',
        firstName: '',
        otherName: '',
        taxIdentificationNo: '',
        residenceAddress: '',
        companyEmail: '',
        salaryNotchId: '',
        maritalStatus: 'Single',
        religionId: '',
        statusId: '',
        secondaryPhoneNumber: '',
        cityOrLocation: '',
        hometown: '',
        rankId: '',
        dateAppointedDateConfig: {
            format: 'MM-DD-YYYY',
            viewMode: 'days',
            defaultDate: new Date()
        },
        dobDateConfig: {
            format: 'MM-DD-YYYY',
            viewMode: 'days',
        },
        tenantId: 0,
        
    },
    validations() {

        return {

            employeeIdentifier: {
                required
            },
            firstName: {
                required
            },
            lastName: {
                required,
            },
             
            primaryPhoneNumber: {
                required,
            },

            categoryId: {
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

        getRanks() {

            axios.get('/PayrollSetups/GetEmployeeRanks').then(response => {

                this.rankList = response.data;

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get ranks.');

            });
        },
        
        getDepartments() {

            axios.get('/SharedResource/GetDepartments').then(response => {

                this.parseDepartmentHierachy(response.data);

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get departments.');

            });
        },

        getCategories() {

            axios.get('/PayrollSetups/GetEmployeeCategories').then(response => {

                this.categoryList = response.data;

            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to get employee categories.');

            });
        },

        getSalaryGrades() {

            axios.get('/PayrollSetups/GetSalaryGrades').then(response => {

                this.salaryGradeList = response.data;

            }).catch(err => {

                console.log(err)
                this.toastHandler('error', 'Unable to get salary grades.');

            });
        },
        
        getNationalities() {

            axios.get('/jsonDataSample/countries.json').then(response => {

                this.nationalityList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get nationalities.');

            });
        },

        getReligions() {

            axios.get('/jsonDataSample/religions.json').then(response => {

                this.religionList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get religions.');

            });
        },

        getEmployeeStatus() {

            axios.get('/PayrollSetups/GetEmployeeStatus').then(response => {

                this.statusList = response.data;

                if (response.data.length) {

                    let statusInfo = this.statusList.find(x => x.isDefault);
                    
                    if (!statusInfo) {
                        this.statusId = this.statusList[0].id;
                    }
                    else {

                        this.statusId = statusInfo.id;
                    }
                }
                

            }).catch(err => {
                
                this.toastHandler('error', 'Unable to get status.');

            });
        },

        saveEmployee() {

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

            payload.employeeIdentifier = this.employeeIdentifier;
            payload.lastName = this.lastName;
            payload.gender = this.gender;
            payload.departmentId = this.emptyGuid;
            payload.categoryId = this.emptyGuid;
            payload.salaryGradeId = this.emptyGuid;
            payload.dateAppointed = this.dateAppointed;

            if (!this.dateAppointed) {

                payload.dateAppointed = new Date();
            }

            payload.personalEmail = this.personalEmail;
            payload.primaryPhoneNumber = this.primaryPhoneNumber;
            payload.nationalityId = this.emptyGuid;
            payload.statusId = this.emptyGuid;
            payload.rankId = this.emptyGuid;
            

            if (this.nationalityId) {

                let nationalityInfo = this.getNationalityDetails(this.nationalityId);
                if (nationalityInfo) {
                    payload.nationalityId = this.nationalityId;
                    payload.nationalityName = nationalityInfo.name;
                }
                
            }

            if (this.departmentId) {

                let departmentInfo = this.getDepartmentDetails(this.departmentId);
                if (departmentInfo) {
                    payload.departmentId = this.departmentId;
                    payload.departmentName = departmentInfo.name;
                }
                

            }

            if (this.categoryId) {

                let categoryInfo = this.getCategoryDetails(this.categoryId);
                if (categoryInfo) {
                    payload.categoryId = this.categoryId;
                    payload.categoryName = categoryInfo.name;
                }
                
            }

            if (this.salaryGradeId) {

                let salaryGradeInfo = this.getSalaryGradeDetails(this.salaryGradeId);
                if (salaryGradeInfo) {
                    payload.salaryGradeId = this.salaryGradeId;
                    payload.salaryGradeName = salaryGradeInfo.name;
                }
                
            }

            payload.dateOfBirth = this.dateOfBirth;

            if (!this.dateOfBirth) {

                payload.dateOfBirth = new Date();
            }

            payload.firstName = this.firstName;
            payload.otherName = this.otherName;
            payload.taxIdentificationNo = this.taxIdentificationNo;
            payload.residenceAddress = this.residenceAddress;
            payload.companyEmail = this.companyEmail;
            payload.salaryNotchId = this.emptyGuid;
            payload.maritalStatus = this.maritalStatus;
            payload.religionId = this.emptyGuid;
            payload.statusId = this.statusId;
             

            if (this.salaryNotchId) {

                let salaryNotchInfo = this.getSalaryNotchDetails(this.salaryNotchId);
                if (salaryNotchInfo) {
                    payload.salaryNotchId = this.salaryNotchId;
                    payload.salaryNotchName = salaryNotchInfo.notch;
                }
                
            }

            if (this.religionId) {

                let religionInfo = this.getReligionDetails(this.religionId);
                if (religionInfo) {
                    payload.religionId = this.religionId;
                    payload.religionName = religionInfo.name;
                }
                
            }

            if (this.statusId) {

                let statusInfo = this.getStatusDetails(this.statusId);
                if (statusInfo) {
                    payload.statusId = this.statusId;
                    payload.statusName = statusInfo.name;
                }

            }


            if (this.rankId) {

                let rankInfo = this.getRankDetails(this.rankId);
                if (rankInfo) {
                    payload.rankId = this.rankId;
                    payload.rankName = rankInfo.name;
                }

            }

            payload.secondaryPhoneNumber = this.secondaryPhoneNumber;
            payload.cityOrLocation = this.cityOrLocation;
            payload.hometown = this.hometown;
            payload.height = 0;
            payload.weight = 0;
            payload.leaveDaysEntitled = 0;
            payload.medicalExpensesLimit = 0;
            payload.userId = 0;

            if (this.employeeId) {

                payload.id = this.employeeId;
                payload.tenantId = this.tenantId;

                axios.post('/PayrollDataEntry/UpdateEmployee', payload).then(response => {

                    this.toastHandler('', 'Employee bio data updated.');

                    this.isLoading = false;

                    this.getEmployees();

                }).catch(err => {

                    this.toastHandler('error', 'Unable to update employee bio data.');
                    this.isLoading = false;

                });


            } else {

                axios.post('/PayrollDataEntry/CreateEmployee', payload).then(response => {

                    if (response.data.code === 200) {

                        this.toastHandler('', 'Employee bio data saved.');

                        this.resetForm(true);

                        this.getEmployees();

                    }
                    else {
                        
                        this.toastHandler('warning', response.data.message);

                    }
                     
                    this.isLoading = false;

                }).catch(err => {

                    this.toastHandler('error', 'Unable to save employee bio data.');
                    this.isLoading = false;

                });
            }

           
        },

        setCurrentEmployee() {

            let employeeInfo = this.getEmployeeDetails(this.employeeId);

            this.employeeIdentifier = employeeInfo.employeeIdentifier;
            this.lastName = employeeInfo.lastName;
            this.gender = employeeInfo.gender;
            this.departmentId = employeeInfo.departmentId;
            this.categoryId = employeeInfo.categoryId;
            this.salaryGradeId = employeeInfo.salaryGradeId;
            this.rankId = employeeInfo.rankId;
            
            this.dateAppointed = employeeInfo.dateAppointed;
            
            this.dateOfBirth = employeeInfo.dateAppointed;
            
            this.personalEmail = employeeInfo.personalEmail;
            this.primaryPhoneNumber = employeeInfo.primaryPhoneNumber;
            this.nationalityId = employeeInfo.nationalityId;

            this.firstName = employeeInfo.firstName;
            this.otherName = employeeInfo.otherName;
            this.taxIdentificationNo = employeeInfo.taxIdentificationNo;
            this.residenceAddress = employeeInfo.residenceAddress;
            this.companyEmail = employeeInfo.companyEmail;
            this.salaryNotchId = employeeInfo.salaryNotchId;
            this.maritalStatus = employeeInfo.maritalStatus;
            this.religionId = employeeInfo.religionId;
            this.statusId = employeeInfo.statusId;

            this.secondaryPhoneNumber = employeeInfo.secondaryPhoneNumber;
            this.cityOrLocation = employeeInfo.cityOrLocation;
            this.hometown = employeeInfo.hometown;
            this.height = 0;
            this.weight = 0;
            this.leaveDaysEntitled = 0;
            this.medicalExpensesLimit = 0;
            this.userId = 0;
            this.tenantId = employeeInfo.tenantId;

        },

        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },

        generateEmployeeIdentifier() {

            axios.get('/SharedResource/GetSystemNumbers').then(response => {

                if (response.data.length) {

                    for (i = 0; i < response.data.length; i++) {

                        let itemName = response.data[i].itemName;

                        if (itemName === 'EmployeeID') {

                            this.currentSystemNumber = response.data[i];

                            this.employeeIdentifier = this.currentSystemNumber.prefix + this.currentSystemNumber.lastNo + this.currentSystemNumber.suffix;

                            break;
                        }

                    }
                }
                else {

                    this.employeeIdentifier = Math.floor(Math.random() * 99999) + 100;
                }


            }).catch(err => {


            });


        },
         

        resetForm(generateEmployeeIdentifier = false) {

            if (generateEmployeeIdentifier) {

                this.generateEmployeeIdentifier();

            } else {

                this.employeeIdentifier = '';
            }
             

            this.lastName = '';
            this.employeeId = '';
            this.gender = 'Male';
            this.departmentId = '';
            this.categoryId = '';
            this.salaryGradeId = '';
            this.dateAppointed = '';
            this.personalEmail = '';
            this.primaryPhoneNumber = '';
            this.nationalityId = '';
            this.dateOfBirth = '';
            this.firstName = '';
            this.otherName = '';
            this.taxIdentificationNo = '';
            this.residenceAddress = '';
            this.companyEmail = '';
            this.salaryNotchId = '';
            this.maritalStatus = 'Single';
            this.religionId = '';
            this.secondaryPhoneNumber = '';
            this.cityOrLocation = '';
            this.hometown = '';
            this.employeeId = '';

            $("#employeeId").ejDropDownList({
                dataSource: this.employeeList,
                watermarkText: "Select Employee",
                value: '',
                width: "100%",
                fields: { id: "id", text: "employeeName", value: "id" },
                enableFilterSearch: true,
                change: (args) => {

                    this.employeeId = args.value;
                }

            });

            this.$v.$reset();

        },


        getStatusDetails(id) {

            return this.statusList.find(a => a.id === id);
        },

        getRankDetails(id) {

            return this.rankList.find(a => a.id === id);
        },

        getNationalityDetails(id) {

            return this.nationalityList.find(a => a.id === id);
        },

        getCategoryDetails(id) {

            return this.categoryList.find(a => a.id === id);
        },

        getSalaryGradeDetails(id) {

            return this.salaryGradeList.find(a => a.id === id);
        },

        getSalaryNotchDetails(id) {

            return this.salaryNotchList.find(a => a.id === id);
        },

        getDepartmentDetails(id) {

            return this.departmentHierachyList.find(a => a.id === id);
        },

        getReligionDetails(id) {

            return this.religionList.find(a => a.id === id);
        },

        getEmployeeDetails(id) {

            return this.employeeList.find(a => a.id === id);
        },

       

        parseDepartmentHierachy(dataArr) {

            this.departmentList = dataArr;

            let departmentHierachyList = [];

            for (let i = 0; i < this.departmentList.length; i++) {

                this.getDepartmentHierachyName(this.departmentList[i].id);

                let name = [...new Set(this.departmentNameList)].join().replace(/,/g, '/');

                departmentHierachyList.push({
                    name: name,
                    parentId: this.departmentList[i].parentId,
                    id: this.departmentList[i].id,
                    rawName: this.departmentList[i].name,
                    tenantId: this.departmentList[i].tenantId,
                });

                name = [];

                this.departmentNameList = [];

            }

            this.departmentHierachyList = departmentHierachyList;

        },

        getDepartmentHierachyName(id) {

            let parentId;
            let returnName;
            this.departmentList.forEach(item => {

                if (item.id === id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }

                this.departmentList.forEach(cc => {
                    if (cc.id === parentId) {
                        return (`${this.getDepartmentHierachyName(parentId)} / ${returnName}`);
                    }
                })

            });

            this.departmentNameList.push(returnName);

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

        salaryGradeId(val) {

            if (val) {

                let salaryGrade = this.getSalaryGradeDetails(val);

                if (salaryGrade) {

                    this.salaryNotchList = salaryGrade.salaryNotches;
                }

            }

        },

        employeeId(val) {

            if (val) {

                this.setCurrentEmployee();

            }

        },

        
    },
    created() {

        this.getEmployees();
        this.getReligions();
        this.getNationalities();
        this.getSalaryGrades();
        this.getCategories();
        this.getDepartments();
        this.getEmployeeStatus();
        this.generateEmployeeIdentifier();
        this.getRanks();
    },
});