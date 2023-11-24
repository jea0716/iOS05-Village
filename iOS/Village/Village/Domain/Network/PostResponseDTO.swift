//
//  PostResponseDTO.swift
//  Village
//
//  Created by 정상윤 on 11/24/23.
//

import Foundation

struct PostResponseDTO: Decodable {
    
    let title: String
    let contents: String
    let price: Int?
    let userID: Int
    let imageURL: String?
    let isRequest: Int
    let startDate: String
    let endDate: String
    
    enum CodingKeys: String, CodingKey {
        case title, contents, price
        case userID = "user_id"
        case imageURL = "post_image"
        case isRequest = "is_request"
        case startDate = "start_date"
        case endDate = "end_date"
    }
    
}
