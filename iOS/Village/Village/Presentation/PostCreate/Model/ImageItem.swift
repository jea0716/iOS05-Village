//
//  ImageItem.swift
//  Village
//
//  Created by 정상윤 on 12/9/23.
//

import Foundation

struct ImageItem: Hashable {
    
    let id = UUID()
    let data: Data
    
    init(data: Data) {
        self.data = data
    }
    
}
