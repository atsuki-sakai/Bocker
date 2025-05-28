/**
 * 郵便番号から住所を取得する関数
 * @param postalCode 郵便番号
 * @returns 住所
 */
export const fetchAddressByPostalCode = async (postalCode: string): Promise<string> => {
    const digits = postalCode.replace(/-/g, '')
    if (!digits || digits.length !== 7) return '郵便番号が不正です'
    try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`)
        const data = await response.json()

        if (data.results && data.results.length > 0) {
            const result = data.results[0]
            const fullAddress = `${result.address1}${result.address2}${result.address3}`
            return fullAddress
        } else if (data.message) {
            return data.message
        } else {
            return '住所が見つかりませんでした'
        }
    } catch (error) {
        console.error("郵便番号から住所を取得する際にエラーが発生しました", error)
        return '住所が見つかりませんでした'
    }
}