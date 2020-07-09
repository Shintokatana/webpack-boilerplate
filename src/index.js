import axios from 'axios';
import "regenerator-runtime/runtime.js";

const { parse } = require('json2csv');

const categoriesEndpoint = "https://www.upwork.com/search/profiles/api/ontology/categories";

const getSearchByCategories = async (categoryUID, occupationUID, page = 1) => {
    return axios.get(`https://www.upwork.com/ab/ats-aas/api/profile-search/profiles?category_uid=${categoryUID}&occupation_uid=${occupationUID}&page=${page}&pt=agency`)
}

const getSingleAgencyInfo = async ciphertext => {
    return axios.get(`https://www.upwork.com/agencies/public/api/agency-profile/agencies/ciphertext/${ciphertext}`)
}

axios.interceptors.response.use(null, (error) => {
    console.log(error.response.data.blockScript);
    if (error.response.data.blockScript) {
        return axios.request(error.config);
    }
});

(async () => {
    const categories = await axios.get(categoriesEndpoint);
    const allResults = [];
    const resultProfilesData = [];
    const fields = ['name', 'orgID', 'url', 'freelancerID'];

    for await (const singleCategory of categories.data) {
        for await (const singleSubCategory of singleCategory.services) {
            const response = await getSearchByCategories(singleSubCategory.uid, singleSubCategory.uid);
            const paging = response.data.results['paging']['pagesTotal'];
            for (let i = 1; i <= paging; i++) {
                const {data: searchResults} = await getSearchByCategories(singleSubCategory.uid, singleSubCategory.uid, i);
                allResults.push(...searchResults.results.profiles);
            }
        }
    }
    console.log(allResults);
    for await (const singlePersonInfo of allResults) {
        const singleAgency = await getSingleAgencyInfo(singlePersonInfo.extendedAgencies[0].ciphertext);
        if (singleAgency&& singleAgency.data && singleAgency.data.data && singleAgency.data.data.orgUid)
            resultProfilesData.push(
                {
                    name: singlePersonInfo.extendedAgencies[0].name,
                    orgID: singleAgency.data.data.orgUid,
                    url: `https://www.upwork.com/agencies/public/api/agency-profile/agencies/ciphertext/${singlePersonInfo.extendedAgencies[0].ciphertext}`,
                    freelancerID: singlePersonInfo.uid
                }
            )
    }
    try {
        const csv = parse(resultProfilesData, { fields })
        const downloadLink = document.createElement("a");
        const blob = new Blob(["\ufeff", csv]);
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = "data.csv";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } catch (e) {
        console.log(e)
    }
    console.log(resultProfilesData);
})()
