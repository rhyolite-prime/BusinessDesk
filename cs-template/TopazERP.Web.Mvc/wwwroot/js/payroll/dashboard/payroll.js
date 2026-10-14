
var vue = new Vue({
    el: '#app',
    components: {
 
        'gender-distribution-chart': VueApexCharts,
        'category-distribution-chart': VueApexCharts,
        'loan-distribution-chart': VueApexCharts,
        'loan-payment-analysis-chart': VueApexCharts,
        
    },
    data: {

        isShimmerLoading: false,
        payload: {},
        genderDistributionChartData: {

            series: [],

            chartOptions: {
                chart: {
                    width: 380,
                    type: 'donut',
                    redrawOnParentResize: false,

                },
                colors: [],
                labels: [],
                dataLabels: {
                    enabled: false
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200
                        },
                        legend: {
                            show: false
                        }
                    }
                }],
                legend: {
                    position: 'right',
                    offsetY: 0,
                    height: 230,
                }
            },

        },
        categoryDistributionChartData: {

            series: [],

            chartOptions: {
                chart: {
                    width: 380,
                    type: 'donut',
                    redrawOnParentResize: false,

                },
                colors: [],
                labels: [],
                dataLabels: {
                    enabled: false
                },
                responsive: [{
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200
                        },
                        legend: {
                            show: false
                        }
                    }
                }],
                legend: {
                    position: 'right',
                    offsetY: 0,
                    height: 230,
                }
            },

        },
         
        loanPaymentAnalysisChartData: {
            series: [],
            chartOptions: {
                chart: {
                    height: 274,
                    type: 'bar',
                    toolbar: {
                        show: false
                    },
                },
                colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560'],
                plotOptions: {
                    bar: {
                        borderRadius: 10,
                        dataLabels: {
                            position: 'bottom', // top, center, bottom
                        },
                    }
                },
                dataLabels: {
                    enabled: false,
                    formatter:  (val) =>{
                        //return val + "%";
                         
                        return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    },
                    offsetY: -20,
                    style: {
                        fontSize: '12px',
                        colors: ["#304758"]
                    }
                },

                xaxis: {
                    categories: [],
                    //position: 'top',
                    position: 'buttom',
                    axisBorder: {
                        show: false
                    },
                    axisTicks: {
                        show: false
                    },
                    crosshairs: {
                        fill: {
                            type: 'gradient',
                            gradient: {
                                colorFrom: '#D8E3F0',
                                colorTo: '#BED1E6',
                                stops: [0, 100],
                                opacityFrom: 0.4,
                                opacityTo: 0.5,
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                    }
                },
                yaxis: {
                    axisBorder: {
                        show: false
                    },
                    axisTicks: {
                        show: false,
                    },
                    labels: {
                        show: false,
                        formatter: function (val) {
                             
                            return val.toLocaleString();
                        }
                    }

                },
                
                title: {
                    text: ' ',
                    floating: true,
                    offsetY: 330,
                    align: 'center',
                    style: {
                        color: '#444'
                    }
                }
            },
        },
    },
    
    methods: {

        getDashboardData() {

            axios.get('/Dashboard/GetPayrollDashboardData').then(response => {


                this.genderDistributionChartData.series = [response.data.genderDistribution.maleInfo.nos, response.data.genderDistribution.femaleInfo.nos];

                this.genderDistributionChartData.chartOptions = {
                    
                    labels: [response.data.genderDistribution.maleInfo.label, response.data.genderDistribution.femaleInfo.label],
                }
                
                let categoryLabels = [];
                
                let categoryData = [];
                
                response.data.categoryDistribution.forEach((v) => {

                    categoryLabels.push(v.categoryName);
                    categoryData.push(v.employeeCount);
                    
                });


                this.categoryDistributionChartData.series =  categoryData;

                this.categoryDistributionChartData.chartOptions = {

                    labels: categoryLabels,
                }


                let seriesList = [];
                let categoriesList = [];
                let loansApprovedData = [];
                let loanPaymentData = [];

                let loanDistribution = response.data.loanDistribution;
                
                let loanPaymentDistribution = response.data.loanPaymentDistribution;

                loanDistribution.forEach(loan => {
                    let matchingPayment = loanPaymentDistribution.find(payment => payment.loanTypeName === loan.loanTypeName);
                    console.log('matchingPayment=>', matchingPayment);
                    if (matchingPayment) {
                        loan.amountPaid = matchingPayment.amountPaid;
                    }else{
                        loan.amountPaid = 0;
                         
                    }
                });

                console.log('loanDistribution=>', loanDistribution);

                loanDistribution.forEach((v) => {

                    categoriesList.push(v.loanTypeName);
                    loansApprovedData.push(v.totalLoanAmount);
                    loanPaymentData.push(v.amountPaid);

                });
                
               
                seriesList.push({ name: "Approved Loans", data: loansApprovedData });
                seriesList.push({ name: "Loan Payments", data: loanPaymentData });
                
                this.loanPaymentAnalysisChartData.series = seriesList;

                this.loanPaymentAnalysisChartData.chartOptions = {
                    xaxis: {

                        categories: categoriesList
                    }
                };
                 
                 
            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve dashboard data.');

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

    created() {

        this.getDashboardData();
        
    },
});