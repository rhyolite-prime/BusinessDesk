const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            levels: [],
            academicYearId: '',
            classId: '',
            levelId:'',
            amount: 0.00,
            currencies: [],
            currencyId: '',
            rate: 0,
            date: new Date().toISOString().substr(0, 10),
            activeTab: 'create',
            foundExisting: false,
            studentId: '',
            tenantId: null,
            balanceId : null,
            isEdit: false,
            page: 1,
            perPage: 10,
            searchText: '',
            isShimmerLoading: false,
            studentList: [],
            classList: [],
            isLoading: false,
            openingBalances:[],
            isMultiCurrency: false,
            IsPosted: false,
            selectedBalances:[],
        }
    },
    computed: {
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
        },
        balanceData() {
            const data = this.openingBalances.map(p => {
                const student = this.students.find(s => s.id === p.studentId);
                const currency = this.currencies.find(c => c.id === p.currencyId);
                const academicYear = this.academicYears.find(c => c.academicYearId === p.currencyId);
                const amount = parseFloat(p.amount) || 0;
                const rate = parseFloat(p.rate) || 1;
                const convertedAmount =  amount * rate;
                const className = this.getClassName(p.classId);
                return {
                    id: p.id,
                    tenantId: p.tenantId,
                    studentId: p.studentId,
                    academicYearId: p.academicYearId,
                    classId: p.classId,
                    currencyId: p.currencyId,
                    date: p.date,
                    amount,
                    rate,
                    convertedAmount,
                    studentName: student ? student.name : '—',
                    studentIdentifier: student ? student.studentIdentifier : '',
                    currencyName: currency ? currency.currencyName : '—',
                    academicYearName: academicYear ? academicYear.name: '—',
                    className
                };
            });

            if (!this.searchText) {
                return data;
            }

            const search = this.searchText.toLowerCase().trim();

            return data.filter(p =>
                (p.studentName || '').toLowerCase().includes(search) ||
                (p.currencyName || '').toLowerCase().includes(search) ||
                (p.amount || '').toString().includes(search) ||
                (p.rate || '').toString().includes(search) ||
                (p.convertedAmount || '').toString().includes(search) ||
                (p.academicYearName || '').toLowerCase().includes(search) ||
                (p.studentIdentifier || '').toLowerCase().includes(search)
            );
        },
        totalPages() {
            return Math.ceil(this.balanceData.length / this.perPage) || 1;
        },
        paginatedData() {
            const start = (this.page - 1) * this.perPage;
            return this.balanceData.slice(start, start + this.perPage);
        },
    },
    methods: {
        nextPage() {
            if (this.page < this.totalPages) this.page++;
        },
        prevPage() {
            if (this.page > 1) this.page--;
        },
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },
        uuid() {
            return([1e7]+ -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        getBalances() {
            return axios.get('/SmBillingAndPayments/GetBalances').then(res => {
                this.openingBalances = res.data.result.filter(b=> !b.isPosted);
                
                this.openingBalances.forEach(p => {
                    p.date = this.formatDate(p.date);
                });
                this.dataTable(this.balanceData);
            });
        },
        getAcademicYears() {
            return axios.get('/SmMainSetups/ListAllAcademicYears').then(res => {
                this.academicYears = res.data;
                const activeYear = this.academicYears.find(y => y.isActive === true);
                if (activeYear) {
                    this.academicYearId = activeYear.id;
                }
            });
        },


        getClasses() {
            return axios.get('/SmMainSetups/ListAllLevelClasses/').then(res => {
                this.classes = res.data;
            });
        },

        getMainClasses() {
            return axios.get('/SmMainSetups/ListAllClasses/').then(res => {
                this.mainClasses = res.data;
            });
        },

        getStreams() {
            return axios.get('/SmMainSetups/ListAllStreams/').then(res => {
                this.streams = res.data;
            });
        },

        getLevels() {
            return axios.get('/SmMainSetups/ListAllLevels/').then(res => {
                this.levels = res.data;
            });
        },


        getCurrencies() {
            return axios.get('/SharedResource/GetCurrencys').then(res => {
                this.currencies = res.data;
                const cediNames = ["ghana cedis", "ghana cedi", "cedi"];
                const activeCurrency = this.currencies.find(y =>
                    cediNames.includes(y.currencyName?.trim().toLowerCase())
                );

                if (activeCurrency) {
                    this.currencyId = activeCurrency.id;
                }
            });
        },

        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(res => {
                this.students = res.data;
                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName} `.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
            });
        },

        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getClassName(classId) {
            const cls = this.allLevelClasses.find(c => c.id === classId);
            return cls ? cls.name : '';
        },
        initDropdowns() {
            const levelClassDropdown = this.getLevelClasses();
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.classList = levelClassDropdown;
        },
        getLevelClasses() {
            return this.classes
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
        },
        getSelectedBalances() {
            let obj = $("#dataTable").ejGrid("instance"), rec = []; this.selectedPayments = [];
            let check = obj.checkSelectedRowsIndexes;
            if (check.length)
            {
                for (let pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }
            this.selectedBalances = rec;
        },

        getRecords(pageInx, inx, proxy, rec)
        {
            if (inx.length) {
                for (let i = 0; i < inx.length; i++) {
                    let pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    let data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

        },
        formatMoney(value) {
            return Number(value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        dataTable(balanceData)
        {
            $("#dataTable").ejGrid({
                dataSource: balanceData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowScrolling: true,
                scrollSettings: { width: "100%" },
                selectionSettings: {
                    selectionMode: ej.Grid.SelectionMode.Multiple,
                    selectionType: ej.Grid.SelectionType.CheckBox
                },
                toolbarSettings: {showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search]},
                columns: [
                    {field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true},
                    { type: "checkbox", width: 20 },
                    {field: "studentName", headerText: "Student", textAlign: ej.TextAlign.Left, width: 140},
                    {field: "date", headerText: "Date", width: 80, format: "{0:yyyy-MM-dd}"},
                    {field: "amount", headerText: "Amount", width: 80, format: "{0:n2}"},
                    {field: "currencyName", headerText: "Currency", textAlign: ej.TextAlign.Left, width: 80},
                    {field: "rate", headerText: "Rate", width: 40, format: "{0:n4}"},
                    {field: "convertedAmount", headerText: "FX Amt", width: 80, format: "{0:n2}"},
                    {field: "tenantId", visible: false, headerText: "Tenant Id", width: 15}
                ],
            });
        },
        async postBalances() {
            this.getSelectedBalances();

            if (!this.selectedBalances.length) {
                this.toastHandler('warning', 'Please select balances to post');
                return;
            }

            this.isLoading = true;

            let payload = {
                balanceIds: this.selectedBalances.map(a => a.id)
            };
            const result = await Swal.fire({
                title: 'Confirm Post',
                text: `Are you sure you want to post balance(s)? Posted transactions cannot be edited!`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d'
            });

            if (!result.isConfirmed) {
                return;
            }
            axios.post('/SmBillingAndPayments/postBalances', payload)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', response.data.message);
                        this.getBalances();
                    } else {
                        this.toastHandler('warning', response.data.message);
                    }
                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to post balances.');
                    this.isLoading = false;
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
        balanceData(newData) {
            if ($("#dataTable").data("ejGrid")) {
                $("#dataTable").ejGrid("destroy");
            }
            this.dataTable(newData);
        }
    },
    async mounted() {
        this.isLoading = true;
        try {
            // Needed for the form
            await Promise.all([
                this.getAcademicYears(),
                this.getMainClasses(),
                this.getStreams(),
                this.getClasses(),
                this.getLevels(),
                this.getStudents(),
                this.getCurrencies(),
            ]);
            this.initDropdowns();
            this.getBalances();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            this.isLoading = false;
        }

    },
});
app.mount('#app');